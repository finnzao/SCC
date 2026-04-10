// ── Metadados de paginação retornados pelo backend ──────────

export interface PaginacaoMeta {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  temProxima: boolean;
  temAnterior: boolean;
}

// ── Resposta paginada genérica ──────────────────────────────

export interface RespostaPaginada<T> {
  success: boolean;
  message?: string;
  data: T[];
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  temProxima: boolean;
  temAnterior: boolean;
}

// ── Parâmetros de requisição para custodiados ───────────────

export interface CustodiadosPaginadosParams {
  page: number;
  size: number;
  nome?: string;
  cpf?: string;
  status?: string;
  ordenarPor?: 'nome' | 'status' | 'proximoComparecimento' | 'ultimoComparecimento';
  direcao?: 'asc' | 'desc';
}

// ── Parâmetros de requisição para comparecimentos ───────────

export interface ComparecimentosPaginadosParams {
  page: number;
  size: number;
  dataInicio?: string;
  dataFim?: string;
  tipoValidacao?: string;
  custodiadoNome?: string;
  numeroProcesso?: string;
}

// ── Parâmetros de exportação ────────────────────────────────

export interface ExportarCustodiadosParams {
  nome?: string;
  cpf?: string;
  status?: string;
  comarca?: string;
  ordenarPor?: string;
  direcao?: string;
}

// ── Resposta de comparecimentos paginados ───────────────────

export interface ComparecimentosPaginadosResponse {
  success: boolean;
  comparecimentos: ComparecimentoComProcesso[];
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  temProxima: boolean;
  temAnterior: boolean;
}

/**
 * Comparecimento com campo numeroProcesso incluso na resposta.
 * Elimina a necessidade de buscar processos separadamente (Correção 2).
 */
export interface ComparecimentoComProcesso {
  id: number;
  custodiadoId: number;
  custodiadoNome: string;
  custodiadoCpf?: string;
  /** NOVO: numero do processo já incluso na resposta do backend */
  numeroProcesso?: string;
  dataComparecimento: string;
  horaComparecimento: string | null;
  tipoValidacao: string;
  validadoPor: string;
  observacoes?: string;
  mudancaEndereco?: boolean;
  anexos?: string;
}

// ── Resposta do endpoint POST /processos/batch ──────────────

export interface BatchProcessosResponse {
  success: boolean;
  data: Record<string, ProcessoResumo[]>;
  totalCustodiados: number;
}

export interface ProcessoResumo {
  id: number;
  custodiadoId: number;
  numeroProcesso: string;
  vara: string;
  situacaoProcesso: string;
}

// ── Constantes de paginação ─────────────────────────────────

export const PAGINACAO_DEFAULTS = {
  /** Tamanho de página padrão para listagens */
  PAGE_SIZE: 20,
  /** Tamanho de página para histórico de comparecimentos */
  HISTORICO_PAGE_SIZE: 50,
  /** Tamanho máximo permitido pelo backend */
  MAX_PAGE_SIZE: 100,
} as const;
