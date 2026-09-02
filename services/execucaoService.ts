// services/execucaoService.ts — Fase 2: registro e consulta de execução penal

import { httpClient } from '@/lib/http/client';
import type { ApiResponse } from '@/lib/http/client';
import type {
  ExecucaoPenal,
  Incidente,
  RegistroIncidentePayload,
  RegistroPenaPayload,
  RemicaoPayload,
  ResultadoIncidentePayload,
} from '@/types/execucao';

const API_BASE = '/execucoes';

export const execucaoService = {
  async registrar(payload: RegistroPenaPayload): Promise<ApiResponse<{ data?: ExecucaoPenal; message?: string }>> {
    return httpClient.post(API_BASE, payload);
  },

  async buscarPorProcesso(processoId: number): Promise<ApiResponse<{ data?: ExecucaoPenal }>> {
    return httpClient.get(`${API_BASE}/processo/${processoId}`);
  },

  async buscarPorId(id: number): Promise<ApiResponse<{ data?: ExecucaoPenal }>> {
    return httpClient.get(`${API_BASE}/${id}`);
  },

  async listar(): Promise<ApiResponse<{ data?: ExecucaoPenal[] }>> {
    return httpClient.get(API_BASE);
  },

  async proximasExtincao(dias = 60): Promise<ApiResponse<{ data?: ExecucaoPenal[] }>> {
    return httpClient.get(`${API_BASE}/proximas-extincao`, { dias });
  },

  async listarIncidentes(execucaoId: number): Promise<ApiResponse<{ data?: Incidente[] }>> {
    return httpClient.get(`${API_BASE}/${execucaoId}/incidentes`);
  },

  async registrarIncidente(execucaoId: number, payload: RegistroIncidentePayload): Promise<ApiResponse<{ data?: Incidente }>> {
    return httpClient.post(`${API_BASE}/${execucaoId}/incidentes`, payload);
  },

  /** ADMIN — soma dias remidos e recalcula o término */
  async lancarRemicao(execucaoId: number, payload: RemicaoPayload): Promise<ApiResponse<{ data?: ExecucaoPenal }>> {
    return httpClient.patch(`${API_BASE}/${execucaoId}/remicao`, payload);
  },

  /** ADMIN — registra a decisão do juízo; única porta para REGREDIDA/EXTINTA */
  async registrarResultado(incidenteId: number, payload: ResultadoIncidentePayload): Promise<ApiResponse<{ data?: Incidente }>> {
    return httpClient.patch(`${API_BASE}/incidentes/${incidenteId}/resultado`, payload);
  },
};
