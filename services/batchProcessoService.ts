import { httpClient } from '@/lib/http/client';
import type { ProcessoResumo } from '@/types/pagination';

// ── Constantes ──────────────────────────────────────────────

/** Máximo de IDs por requisição batch (limite do backend) */
const MAX_BATCH_SIZE = 200;

// ── Função principal ────────────────────────────────────────

/**
 * Busca processos de múltiplos custodiados em uma única requisição.
 *
 * @param custodiadoIds Lista de IDs numéricos dos custodiados
 * @returns Mapa de custodiadoId -> lista de processos
 *
 * @example
 * ```ts
 * const resultado = await buscarProcessosEmLote([1, 2, 3]);
 * // resultado = { "1": [{ numeroProcesso: "...", ... }], "2": [...], "3": [] }
 * ```
 */
export async function buscarProcessosEmLote(
  custodiadoIds: number[]
): Promise<Record<string, ProcessoResumo[]>> {
  if (!custodiadoIds || custodiadoIds.length === 0) {
    return {};
  }

  // Remover IDs inválidos e duplicados
  const idsUnicos = [...new Set(custodiadoIds.filter(id => id > 0))];

  if (idsUnicos.length === 0) {
    return {};
  }

  // Se ultrapassar o limite, dividir em chunks
  if (idsUnicos.length > MAX_BATCH_SIZE) {
    return buscarEmChunks(idsUnicos);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await httpClient.post<any>('/processos/batch', {
      custodiadoIds: idsUnicos,
    });

    if (response.success && response.data) {
      const dados = response.data.data || response.data;
      return typeof dados === 'object' ? dados : {};
    }

    console.warn('[BatchProcessos] Resposta sem sucesso:', response.message);
    return {};
  } catch (error) {
    console.error('[BatchProcessos] Erro na busca em lote:', error);

    // Fallback: buscar individualmente (comportamento antigo)
    // Isso garante que a funcionalidade não quebre se o endpoint
    // batch ainda não estiver implementado no backend
    console.warn('[BatchProcessos] Fallback para busca individual');
    return buscarIndividualmente(idsUnicos);
  }
}

// ── Funções auxiliares ──────────────────────────────────────

/**
 * Divide IDs em chunks de MAX_BATCH_SIZE e faz requisições paralelas.
 * Usado quando há mais de 200 IDs para buscar.
 */
async function buscarEmChunks(
  ids: number[]
): Promise<Record<string, ProcessoResumo[]>> {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
    chunks.push(ids.slice(i, i + MAX_BATCH_SIZE));
  }

  // Executar chunks em paralelo (máximo 3 simultâneos)
  const resultados: Record<string, ProcessoResumo[]> = {};

  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3);
    const promises = batch.map(chunk => buscarProcessosEmLote(chunk));
    const responses = await Promise.allSettled(promises);

    for (const response of responses) {
      if (response.status === 'fulfilled') {
        Object.assign(resultados, response.value);
      }
    }
  }

  return resultados;
}

/**
 * Fallback: busca processos individualmente.
 *
 * Usado quando o endpoint batch não está disponível.
 * Limita a 10 requisições simultâneas para não sobrecarregar.
 *
 * TODO: Remover quando o endpoint batch estiver estável.
 */
async function buscarIndividualmente(
  ids: number[]
): Promise<Record<string, ProcessoResumo[]>> {
  const resultados: Record<string, ProcessoResumo[]> = {};
  const CONCURRENT_LIMIT = 10;

  for (let i = 0; i < ids.length; i += CONCURRENT_LIMIT) {
    const batch = ids.slice(i, i + CONCURRENT_LIMIT);
    const promises = batch.map(async (id) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resp = await httpClient.get<any>(`/processos/custodiado/${id}`);
        if (resp.success && resp.data) {
          const lista = resp.data?.data || resp.data || [];
          const procs = Array.isArray(lista) ? lista : [];
          resultados[String(id)] = procs.map((p: Record<string, unknown>) => ({
            id: p.id as number,
            custodiadoId: id,
            numeroProcesso: (p.numeroProcesso as string) || '',
            vara: (p.vara as string) || '',
            situacaoProcesso: (p.situacaoProcesso as string) || '',
          }));
        } else {
          resultados[String(id)] = [];
        }
      } catch {
        resultados[String(id)] = [];
      }
    });

    await Promise.allSettled(promises);
  }

  return resultados;
}
