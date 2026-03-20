// services/processoService.ts - F2: Serviço de API para Processos

import { httpClient } from '@/lib/http/client';
import type { ApiResponse } from '@/lib/http/client';
import type {
  Processo,
  ProcessoDTO,
  ProcessoListResponse,
  ContadoresDashboard,
  ProcessoApiResponse,
} from '@/types/processo';

const API_BASE = '/processos';

export const processoService = {
  /**
   * Listagem paginada com filtros
   * GET /api/processos?page=0&size=20&termo=&status=
   */
  async listar(
    page = 0,
    size = 20,
    termo?: string,
    status?: string
  ): Promise<ApiResponse<ProcessoApiResponse<ProcessoListResponse>>> {
    const params: Record<string, string | number> = { page, size };
    if (termo) params.termo = termo;
    if (status) params.status = status;
    return httpClient.get(`${API_BASE}`, params);
  },

  /**
   * Buscar processo por ID
   * GET /api/processos/{id}
   */
  async buscarPorId(id: number): Promise<ApiResponse<ProcessoApiResponse<Processo>>> {
    return httpClient.get(`${API_BASE}/${id}`);
  },

  /**
   * Processos ativos de um custodiado
   * GET /api/processos/custodiado/{custodiadoId}
   */
  async buscarPorCustodiado(custodiadoId: number): Promise<ApiResponse<ProcessoApiResponse<Processo[]>>> {
    return httpClient.get(`${API_BASE}/custodiado/${custodiadoId}`);
  },

  /**
   * Buscar por número do processo
   * GET /api/processos/numero/{numero}
   */
  async buscarPorNumero(numero: string): Promise<ApiResponse<ProcessoApiResponse<Processo>>> {
    return httpClient.get(`${API_BASE}/numero/${encodeURIComponent(numero)}`);
  },

  /**
   * Criar processo vinculado a custodiado
   * POST /api/processos
   */
  async criar(dto: ProcessoDTO): Promise<ApiResponse<ProcessoApiResponse<Processo>>> {
    return httpClient.post(`${API_BASE}`, dto);
  },

  /**
   * Atualizar dados processuais
   * PUT /api/processos/{id}
   */
  async atualizar(id: number, dto: Partial<ProcessoDTO>): Promise<ApiResponse<ProcessoApiResponse<Processo>>> {
    return httpClient.put(`${API_BASE}/${id}`, dto);
  },

  /**
   * Encerrar processo (soft delete)
   * DELETE /api/processos/{id}
   */
  async encerrar(id: number): Promise<ApiResponse<ProcessoApiResponse<void>>> {
    return httpClient.delete(`${API_BASE}/${id}`);
  },

  /**
   * Suspender processo
   * POST /api/processos/{id}/suspender
   */
  async suspender(id: number): Promise<ApiResponse<ProcessoApiResponse<Processo>>> {
    return httpClient.post(`${API_BASE}/${id}/suspender`);
  },

  /**
   * Reativar processo
   * POST /api/processos/{id}/reativar
   */
  async reativar(id: number): Promise<ApiResponse<ProcessoApiResponse<Processo>>> {
    return httpClient.post(`${API_BASE}/${id}/reativar`);
  },

  /**
   * Lista processos inadimplentes
   * GET /api/processos/inadimplentes
   */
  async inadimplentes(): Promise<ApiResponse<ProcessoApiResponse<Processo[]>>> {
    return httpClient.get(`${API_BASE}/inadimplentes`);
  },

  /**
   * Comparecimentos previstos para hoje
   * GET /api/processos/hoje
   */
  async hoje(): Promise<ApiResponse<ProcessoApiResponse<Processo[]>>> {
    return httpClient.get(`${API_BASE}/hoje`);
  },

  /**
   * Contadores para dashboard
   * GET /api/processos/contadores
   */
  async contadores(): Promise<ApiResponse<ProcessoApiResponse<ContadoresDashboard>>> {
    return httpClient.get(`${API_BASE}/contadores`);
  },
};
