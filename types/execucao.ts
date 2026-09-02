// Fase 2 do regime aberto — registro de pena (ExecucaoPenal)

export type OrigemCalculo = 'SENTENCA' | 'DOSIMETRIA_CALCULADA';

export type SituacaoExecucao =
  | 'EM_CUMPRIMENTO'
  | 'AGUARDANDO_JUSTIFICACAO'
  | 'SUSPENSA'
  | 'REGREDIDA'
  | 'EXTINTA';

/** Estado do formulário de registro (os dois cards). */
export interface RegistroPenaForm {
  origemCalculo: OrigemCalculo | null;
  numeroExecucao: string;
  guiaRecolhimento: string;
  numeroSeeu: string;
  diasDetraidos: string; // vazio = guia já veio líquida
  dataInicio: string;   // yyyy-MM-dd (input type="date")
  // Card 1 — SENTENCA
  dataTermino: string;
  // Card 2 — DOSIMETRIA_CALCULADA
  anos: string;
  meses: string;
  dias: string;
  observacoes: string;
}

/** Payload enviado ao backend (POST /api/execucoes). */
export interface RegistroPenaPayload {
  processoId: number;
  origemCalculo: OrigemCalculo;
  numeroExecucao: string;
  guiaRecolhimento?: string;
  numeroSeeu?: string;
  diasDetraidos?: number;
  dataInicio: string;
  dataTermino?: string;
  anos?: number;
  meses?: number;
  dias?: number;
  observacoes?: string;
}

export type TipoIncidente =
  | 'DESCUMPRIMENTO_COMPARECIMENTO'
  | 'MUDANCA_NAO_AUTORIZADA'
  | 'NOVO_CRIME'
  | 'PEDIDO_AUTORIZACAO_VIAGEM'
  | 'EXTINCAO_PUNIBILIDADE'
  | 'OUTRO';

export type ResultadoIncidente =
  | 'AGUARDANDO'
  | 'JUSTIFICADO'
  | 'NAO_JUSTIFICADO'
  | 'ADVERTENCIA'
  | 'REGRESSAO_DECRETADA'
  | 'EXTINCAO_DECLARADA'
  | 'ARQUIVADO';

export interface Incidente {
  id: number;
  tipo: TipoIncidente;
  tipoDescricao: string;
  dataOcorrencia: string;
  descricao: string;
  dataAudiencia?: string;
  resultado: ResultadoIncidente;
  resultadoDescricao: string;
  dataDecisao?: string;
  registradoPor: string;
  decididoPor?: string;
}

export interface RegistroIncidentePayload {
  tipo: TipoIncidente;
  dataOcorrencia: string;
  descricao: string;
  dataAudiencia?: string;
}

// A: diasTrabalhados/horasEstudo (backend converte pela LEP 126) · B: dias direto
export interface RemicaoPayload {
  dias?: number;
  diasTrabalhados?: number;
  horasEstudo?: number;
}

export interface ResultadoIncidentePayload {
  resultado: ResultadoIncidente;
  dataDecisao: string;
  dataAudiencia?: string;
}

export interface ExecucaoPenal {
  id: number;
  processoId: number;
  numeroProcesso: string;
  custodiadoNome?: string;
  numeroExecucao: string;
  guiaRecolhimento?: string;
  numeroSeeu?: string;
  dataInicioCumprimento: string;
  penaTotalDias: number;
  diasDetraidos: number;
  diasRemidos: number;
  dataTerminoOriginal: string;
  dataTerminoPrevista: string;
  origemCalculo: OrigemCalculo;
  situacaoExecucao: SituacaoExecucao;
  situacaoDescricao: string;
  diasCumpridos: number;
  diasRestantes: number;
  observacoes?: string;
}
