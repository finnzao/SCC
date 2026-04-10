import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '@/lib/http/client';
import type {
  ComparecimentosPaginadosParams,
  ComparecimentoComProcesso,
  PaginacaoMeta,
} from '@/types/pagination';

// ── Tipos do hook ───────────────────────────────────────────

interface UseComparecimentosPaginadosOptions {
  /** Quantidade de registros por página (default: 50) */
  size?: number;
  /** Carregar automaticamente ao montar */
  autoLoad?: boolean;
  /** Filtros iniciais */
  filtrosIniciais?: {
    dataInicio?: string;
    dataFim?: string;
    tipoValidacao?: string;
    custodiadoNome?: string;
    numeroProcesso?: string;
  };
}

interface UseComparecimentosPaginadosReturn {
  /** Lista de comparecimentos da página atual (já com numeroProcesso) */
  comparecimentos: ComparecimentoComProcesso[];
  /** Metadados de paginação */
  paginacao: PaginacaoMeta;
  /** Indica se está carregando */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Filtros atualmente aplicados */
  filtrosAtivos: Partial<ComparecimentosPaginadosParams>;

  // ── Ações ──

  /** Navegar para uma página */
  irParaPagina: (page: number) => void;
  /** Próxima página */
  proximaPagina: () => void;
  /** Página anterior */
  paginaAnterior: () => void;
  /** Aplicar filtros (reseta para página 0) */
  aplicarFiltros: (filtros: Partial<ComparecimentosPaginadosParams>) => void;
  /** Limpar filtros */
  limparFiltros: () => void;
  /** Forçar recarregamento */
  refetch: () => void;
}

// ── Estado inicial ──────────────────────────────────────────

const PAGINACAO_INICIAL: PaginacaoMeta = {
  paginaAtual: 0,
  totalPaginas: 0,
  totalItens: 0,
  itensPorPagina: 50,
  temProxima: false,
  temAnterior: false,
};

// ── Utilitário para normalizar tipo de validação ────────────

const TipoValidacaoUtils = {
  normalize(tipo: string): string {
    return tipo.toLowerCase();
  },
  format(tipo: string): string {
    const f: Record<string, string> = {
      presencial: 'Presencial',
      online: 'Online',
      cadastro_inicial: 'Cadastro Inicial',
    };
    return f[tipo.toLowerCase()] || tipo;
  },
};

// ── Hook principal ──────────────────────────────────────────

export function useComparecimentosPaginados(
  options: UseComparecimentosPaginadosOptions = {}
): UseComparecimentosPaginadosReturn {
  const { size = 50, autoLoad = true, filtrosIniciais = {} } = options;

  // Estado dos dados
  const [comparecimentos, setComparecimentos] = useState<ComparecimentoComProcesso[]>([]);
  const [paginacao, setPaginacao] = useState<PaginacaoMeta>({
    ...PAGINACAO_INICIAL,
    itensPorPagina: size,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado dos parâmetros
  const [params, setParams] = useState<ComparecimentosPaginadosParams>({
    page: 0,
    size,
    dataInicio: filtrosIniciais.dataInicio,
    dataFim: filtrosIniciais.dataFim,
    tipoValidacao: filtrosIniciais.tipoValidacao,
    custodiadoNome: filtrosIniciais.custodiadoNome,
    numeroProcesso: filtrosIniciais.numeroProcesso,
  });

  // Ref para cancelar requisições pendentes
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Busca comparecimentos no backend com paginação server-side.
   *
   * CORREÇÃO 2: O backend agora retorna `numeroProcesso` em cada item,
   * então NÃO fazemos mais o loop de busca de processos separadamente.
   *
   * CORREÇÃO 3: Enviamos page, size e filtros. O backend aplica no SQL.
   * Não pedimos mais size=1000.
   */
  const buscar = useCallback(async (parametros: ComparecimentosPaginadosParams) => {
    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Montar query params apenas com valores definidos
      const queryParams: Record<string, string | number> = {
        page: parametros.page,
        size: parametros.size,
      };
      if (parametros.dataInicio) queryParams.dataInicio = parametros.dataInicio;
      if (parametros.dataFim) queryParams.dataFim = parametros.dataFim;
      if (parametros.tipoValidacao) queryParams.tipoValidacao = parametros.tipoValidacao;
      if (parametros.custodiadoNome) queryParams.custodiadoNome = parametros.custodiadoNome;
      if (parametros.numeroProcesso) queryParams.numeroProcesso = parametros.numeroProcesso;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await httpClient.get<any>('/comparecimentos/todos', queryParams);

      // Ignorar se requisição cancelada
      if (abortControllerRef.current?.signal.aborted) return;

      if (response.success && response.data) {
        const dados = response.data;

        // Extrair lista de comparecimentos da resposta
        // O backend pode retornar em diferentes formatos
        let lista: ComparecimentoComProcesso[] = [];
        if (dados.comparecimentos && Array.isArray(dados.comparecimentos)) {
          lista = dados.comparecimentos;
        } else if (dados.data?.comparecimentos && Array.isArray(dados.data.comparecimentos)) {
          lista = dados.data.comparecimentos;
        } else if (Array.isArray(dados)) {
          lista = dados;
        } else if (Array.isArray(dados.data)) {
          lista = dados.data;
        }

        // Formatar campos para exibição
        const formatados = lista.map((item: ComparecimentoComProcesso) => ({
          ...item,
          // CORREÇÃO 2: numeroProcesso já vem preenchido pelo backend.
          // Não precisamos mais buscar processos separadamente.
          tipoValidacaoFormatado: TipoValidacaoUtils.format(item.tipoValidacao || ''),
          dataFormatada: formatarData(item.dataComparecimento),
          horaFormatada: item.horaComparecimento
            ? item.horaComparecimento.substring(0, 5)
            : '—',
        }));

        setComparecimentos(formatados);

        // Atualizar metadados de paginação
        const meta = dados.data || dados;
        if (meta.totalPaginas !== undefined) {
          setPaginacao({
            paginaAtual: meta.paginaAtual ?? parametros.page,
            totalPaginas: meta.totalPaginas ?? 1,
            totalItens: meta.totalItens ?? 0,
            itensPorPagina: meta.itensPorPagina ?? parametros.size,
            temProxima: meta.temProxima ?? false,
            temAnterior: meta.temAnterior ?? false,
          });
        } else {
          // Fallback se backend não enviar metadados de paginação
          setPaginacao({
            paginaAtual: parametros.page,
            totalPaginas: 1,
            totalItens: formatados.length,
            itensPorPagina: parametros.size,
            temProxima: false,
            temAnterior: parametros.page > 0,
          });
        }
      } else {
        throw new Error(response.message || 'Erro ao carregar comparecimentos');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      console.error('[useComparecimentosPaginados] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar comparecimentos');
      setComparecimentos([]);
      setPaginacao(PAGINACAO_INICIAL);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar quando params mudam
  useEffect(() => {
    if (autoLoad) {
      buscar(params);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [params, buscar, autoLoad]);

  // ── Ações ─────────────────────────────────────────────────

  const irParaPagina = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  const proximaPagina = useCallback(() => {
    if (paginacao.temProxima) {
      setParams(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [paginacao.temProxima]);

  const paginaAnterior = useCallback(() => {
    if (paginacao.temAnterior) {
      setParams(prev => ({ ...prev, page: Math.max(0, prev.page - 1) }));
    }
  }, [paginacao.temAnterior]);

  const aplicarFiltros = useCallback(
    (filtros: Partial<ComparecimentosPaginadosParams>) => {
      setParams(prev => ({
        ...prev,
        ...filtros,
        page: 0, // Voltar para primeira página ao filtrar
      }));
    },
    []
  );

  const limparFiltros = useCallback(() => {
    setParams({ page: 0, size });
  }, [size]);

  const refetch = useCallback(() => {
    buscar(params);
  }, [buscar, params]);

  return {
    comparecimentos,
    paginacao,
    loading,
    error,
    filtrosAtivos: params,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    aplicarFiltros,
    limparFiltros,
    refetch,
  };
}

// ── Utilitários internos ────────────────────────────────────

function formatarData(data: string): string {
  if (!data) return '';
  try {
    const [y, m, d] = data.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  } catch {
    return data;
  }
}
