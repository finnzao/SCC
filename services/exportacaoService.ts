/* eslint-disable @typescript-eslint/no-unused-vars */
import { httpClient } from '@/lib/http/client';
import type { ExportarCustodiadosParams } from '@/types/pagination';

// ── Interface de resultado da exportação ────────────────────

export interface ExportResult {
  success: boolean;
  message: string;
  filename?: string;
}
/**
 * Exporta custodiados para Excel via endpoint do backend.
 *
 * O backend gera o arquivo .xlsx completo e retorna como blob.
 * O frontend apenas recebe o binário e aciona o download.
 *
 * @param filtros Filtros opcionais (mesmos filtros ativos na tela)
 * @returns Resultado da exportação com mensagem de sucesso/erro
 *
 * @example
 * ```tsx
 * const resultado = await exportarCustodiadosExcel({
 *   nome: 'Maria',
 *   status: 'INADIMPLENTE'
 * });
 * ```
 */
export async function exportarCustodiadosExcel(
  filtros?: ExportarCustodiadosParams
): Promise<ExportResult> {
  try {
    // Montar query params apenas com filtros que têm valor
    const params = new URLSearchParams();
    if (filtros?.nome) params.set('nome', filtros.nome);
    if (filtros?.cpf) params.set('cpf', filtros.cpf);
    if (filtros?.status) params.set('status', filtros.status);
    if (filtros?.comarca) params.set('comarca', filtros.comarca);
    if (filtros?.ordenarPor) params.set('ordenarPor', filtros.ordenarPor);
    if (filtros?.direcao) params.set('direcao', filtros.direcao);

    const query = params.toString() ? `?${params.toString()}` : '';
    const url = `/exportar/custodiados-processos${query}`;

    // Usar httpClient.download que já trata blob e Content-Disposition
    const resultado = await httpClient.download(
      url,
      `custodiados-processos-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    if (resultado.success) {
      return {
        success: true,
        message: 'Planilha exportada com sucesso!',
        filename: `custodiados-processos-${new Date().toISOString().split('T')[0]}.xlsx`
      };
    }

    return {
      success: false,
      message: resultado.error || 'Erro ao exportar planilha'
    };
  } catch (error) {
    console.error('[ExportService] Erro ao exportar:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido ao exportar'
    };
  }
}

/**
 * Exportação com fallback para client-side.
 *
 *
 * @param filtros Filtros opcionais
 * @param dadosFallback Dados já carregados no frontend para fallback
 * @param exportFallbackFn Função legada de exportação client-side
 */
export async function exportarComFallback(
  filtros?: ExportarCustodiadosParams,
  dadosFallback?: unknown[],
  exportFallbackFn?: (dados: unknown[], filtrados: unknown[]) => { success: boolean; message: string }
): Promise<ExportResult> {
  try {
    // Tentar exportação server-side primeiro
    const resultado = await exportarCustodiadosExcel(filtros);

    if (resultado.success) {
      return resultado;
    }

    // Se falhou e temos fallback, usar exportação client-side
    if (dadosFallback && exportFallbackFn) {
      console.warn('[ExportService] Fallback para exportação client-side');
      const fallbackResult = exportFallbackFn(dadosFallback, dadosFallback);
      return {
        success: fallbackResult.success,
        message: fallbackResult.message
      };
    }

    return resultado;
  } catch (error) {
    // Em caso de erro de rede, tentar fallback
    if (dadosFallback && exportFallbackFn) {
      console.warn('[ExportService] Erro de rede, usando fallback client-side');
      const fallbackResult = exportFallbackFn(dadosFallback, dadosFallback);
      return {
        success: fallbackResult.success,
        message: fallbackResult.message
      };
    }

    return {
      success: false,
      message: 'Erro ao exportar. Tente novamente.'
    };
  }
}
