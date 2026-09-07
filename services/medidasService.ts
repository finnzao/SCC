import { httpClient, type ApiResponse } from '@/lib/http/client';

export interface MedidaCautelar {
  id: number;
  tipoMedida: string;
  descricao: string;
  baseLegal: string;
  dataImposicao: string;
  dataRevogacao?: string | null;
  detalhe?: string | null;
  registradoPor: string;
  vigente: boolean;
}

export const TIPOS_MEDIDA: { valor: string; rotulo: string }[] = [
  { valor: 'COMPARECIMENTO_PERIODICO', rotulo: 'Comparecimento periódico (art. 319, I)' },
  { valor: 'PROIBICAO_FREQUENTAR_LUGARES', rotulo: 'Proibição de frequentar lugares (II)' },
  { valor: 'PROIBICAO_CONTATO', rotulo: 'Proibição de contato (III)' },
  { valor: 'PROIBICAO_AUSENTAR_COMARCA', rotulo: 'Proibição de ausentar-se da comarca (IV)' },
  { valor: 'RECOLHIMENTO_NOTURNO', rotulo: 'Recolhimento domiciliar noturno (V)' },
  { valor: 'SUSPENSAO_FUNCAO', rotulo: 'Suspensão de função pública (VI)' },
  { valor: 'INTERNACAO_PROVISORIA', rotulo: 'Internação provisória (VII)' },
  { valor: 'FIANCA', rotulo: 'Fiança (VIII)' },
  { valor: 'MONITORACAO_ELETRONICA', rotulo: 'Monitoração eletrônica (IX)' },
  { valor: 'OUTRA', rotulo: 'Outra medida ou condição' },
];

export const medidasService = {
  async listar(processoId: number): Promise<ApiResponse<{ data?: MedidaCautelar[] }>> {
    return httpClient.get(`/processos/${processoId}/medidas`);
  },

  async registrar(processoId: number, payload: {
    tipoMedida: string; dataImposicao: string; detalhe?: string;
  }): Promise<ApiResponse<{ data?: MedidaCautelar }>> {
    return httpClient.post(`/processos/${processoId}/medidas`, payload);
  },

  async revogar(id: number, dataRevogacao: string): Promise<ApiResponse<{ data?: MedidaCautelar }>> {
    return httpClient.patch(`/medidas-cautelares/${id}/revogar`, { dataRevogacao });
  },
};
