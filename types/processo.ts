// types/processo.ts - F1: Tipos TypeScript para a entidade Processo

export type SituacaoProcesso = 'ATIVO' | 'ENCERRADO' | 'SUSPENSO';
export type StatusComparecimento = 'EM_CONFORMIDADE' | 'INADIMPLENTE';

/**
 * Processo retornado pela API GET /api/processos
 */
export interface Processo {
  id: number;
  custodiadoId: number;
  custodiadoNome: string;
  custodiadoCpf: string;
  numeroProcesso: string;
  vara: string;
  comarca: string;
  dataDecisao: string; // yyyy-MM-dd
  periodicidade: number;
  periodicidadeDescricao: string;
  dataComparecimentoInicial: string;
  status: StatusComparecimento;
  ultimoComparecimento: string | null;
  proximoComparecimento: string | null;
  situacaoProcesso: SituacaoProcesso;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string | null;
  version?: number;
  diasAtraso: number;
  inadimplente: boolean;
  comparecimentoHoje: boolean;
}

/**
 * DTO para criar/atualizar processo via POST/PUT /api/processos
 */
export interface ProcessoDTO {
  custodiadoId: number;
  numeroProcesso: string;
  vara: string;
  comarca: string;
  dataDecisao: string;
  periodicidade: number;
  dataComparecimentoInicial: string;
  observacoes?: string;
}

/**
 * Resposta paginada de GET /api/processos
 */
export interface ProcessoListResponse {
  processos: Processo[];
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
}

/**
 * Contadores do dashboard via GET /api/processos/contadores
 */
export interface ContadoresDashboard {
  totalProcessosAtivos: number;
  emConformidade: number;
  inadimplentes: number;
  comparecimentosHoje: number;
  dataConsulta: string;
}

/**
 * Resposta padrão da API com wrapper success/message/data
 */
export interface ProcessoApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Badge configs para situação do processo
 */
export const SITUACAO_PROCESSO_CONFIG: Record<SituacaoProcesso, { label: string; color: string; bgColor: string }> = {
  ATIVO: { label: 'Ativo', color: 'text-green-800', bgColor: 'bg-green-100' },
  ENCERRADO: { label: 'Encerrado', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  SUSPENSO: { label: 'Suspenso', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
};

/**
 * Badge configs para status de comparecimento
 */
export const STATUS_COMPARECIMENTO_CONFIG: Record<StatusComparecimento, { label: string; color: string; bgColor: string }> = {
  EM_CONFORMIDADE: { label: 'Em Conformidade', color: 'text-green-800', bgColor: 'bg-green-100' },
  INADIMPLENTE: { label: 'Inadimplente', color: 'text-red-800', bgColor: 'bg-red-100' },
};
