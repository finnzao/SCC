/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient, ApiResponse } from '../http/client';
import { httpClient } from '@/lib/http/client';
import { requestCache } from '@/lib/cache/requestCache';
import type {
  CustodiadoResponse,
  ComparecimentoResponse,
  UsuarioResponse,
  CustodiadoDTO,
  ComparecimentoDTO,
  UsuarioDTO,
  StatusComparecimento,
  PeriodoParams,
  BuscarParams,
  EstatisticasComparecimentoResponse,
  ResumoSistemaResponse,
  SetupStatusResponse,
  SetupAdminDTO,
  HealthResponse,
  AppInfoResponse,
  StatusVerificacaoResponse,
  StatusEstatisticasResponse,
  ListarCustodiadosResponse,
  ListarComparecimentosParams,
  ListarComparecimentosResponse,
  ValidarConviteResponse,
} from '@/types/api';

const ENDPOINTS = {
  BASE: '/comparecimentos',
  REGISTRAR: '/comparecimentos/registrar',
  CUSTODIADO: (id: number) => `/comparecimentos/custodiado/${id}`,
  PERIODO: '/comparecimentos/periodo',
  HOJE: '/comparecimentos/hoje',
  ESTATISTICAS: '/comparecimentos/estatisticas',
  RESUMO: '/comparecimentos/resumo/sistema',
  TODOS: '/comparecimentos/todos',
  FILTRAR: '/comparecimentos/filtrar'
} as const;

export function initializeBackendApi() {
  console.log('[Services] API inicializada');
}

export function configureAuthHeaders(token: string) {
  apiClient.setAuthToken(token);
  console.log('[Services] Token de autenticação configurado');
}

export function clearAuthHeaders() {
  apiClient.clearAuth();
  console.log('[Services] Token de autenticação removido');
}

export const custodiadosService = {
  async listar(options?: {
    forceRefresh?: boolean;
    cacheTimeout?: number;
  }): Promise<ListarCustodiadosResponse> {
    const cacheKey = 'custodiados:list';
    const cacheTimeout = options?.cacheTimeout || 5 * 60 * 1000;

    if (!options?.forceRefresh) {
      const cached = requestCache.get<ListarCustodiadosResponse>(cacheKey);
      if (cached) {
        console.log('[CustodiadosService] Retornando dados do cache');
        return cached;
      }
    }

    try {
      const response = await apiClient.get<any>('/custodiados');
      console.log('[CustodiadosService] Resposta bruta:', response);

      let parsedData: any;

      try {
        if (typeof response.data === 'string') {
          const trimmedData = response.data.trim();

          if (trimmedData.length === 0) {
            return {
              success: false,
              message: 'Servidor retornou resposta vazia',
              data: []
            };
          }

          parsedData = JSON.parse(trimmedData);
        } else if (response.data === null || response.data === undefined) {
          return {
            success: false,
            message: 'Servidor não retornou dados',
            data: []
          };
        } else {
          parsedData = response.data;
        }
      } catch (parseError) {
        console.error('[CustodiadosService] Erro no parse do JSON:', parseError);
        return {
          success: false,
          message: 'Erro ao processar resposta do servidor',
          data: []
        };
      }

      let result: ListarCustodiadosResponse = {
        success: false,
        message: 'Nenhum custodiado encontrado',
        data: []
      };

      if (parsedData && parsedData.success && Array.isArray(parsedData.data)) {
        result = {
          success: true,
          message: parsedData.message || `${parsedData.data.length} custodiados carregados`,
          data: parsedData.data
        };
      } else if (Array.isArray(parsedData)) {
        result = {
          success: true,
          message: `${parsedData.length} custodiados carregados`,
          data: parsedData
        };
      } else if (parsedData && typeof parsedData === 'object') {
        const possibleKeys = ['data', 'custodiados', 'items', 'results', 'content'];

        for (const key of possibleKeys) {
          if (key in parsedData && Array.isArray((parsedData as any)[key])) {
            const arrayData = (parsedData as any)[key];
            result = {
              success: true,
              message: `${arrayData.length} custodiados carregados`,
              data: arrayData
            };
            break;
          }
        }
      }

      if (result.success && result.data.length > 0) {
        requestCache.set(cacheKey, result, cacheTimeout);
      }

      return result;

    } catch (error) {
      console.error('[CustodiadosService] Erro ao listar custodiados:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao listar custodiados',
        data: []
      };
    }
  },

  async buscarPorId(id: string | number, options?: {
    forceRefresh?: boolean;
    cacheTimeout?: number;
  }): Promise<CustodiadoResponse | null> {
    if (!id) return null;

    const cacheKey = `custodiados:id:${id}`;
    const cacheTimeout = options?.cacheTimeout || 2 * 60 * 1000;

    if (!options?.forceRefresh) {
      const cached = requestCache.get<CustodiadoResponse>(cacheKey);
      if (cached) {
        console.log(`[CustodiadosService] Retornando custodiado ${id} do cache`);
        return cached;
      }
    }

    try {
      console.log(`[CustodiadosService] Buscando custodiado ID: ${id}`);
      const response = await apiClient.get<CustodiadoResponse>(`/custodiados/${id}`);

      const result = response.success ? response.data || null : null;

      if (result) {
        requestCache.set(cacheKey, result, cacheTimeout);
      }

      return result;

    } catch (error) {
      console.error(`[CustodiadosService] Erro ao buscar custodiado ${id}:`, error);
      return null;
    }
  },

  async criar(data: CustodiadoDTO): Promise<ApiResponse<CustodiadoResponse>> {
    try {
      console.log('[CustodiadosService] Criando custodiado:', data);

      const response = await apiClient.post<CustodiadoResponse>('/custodiados', data);

      if (response.success) {
        requestCache.clear('custodiados:list');
      }

      return response;

    } catch (error) {
      console.error('[CustodiadosService] Erro ao criar custodiado:', error);

      return {
        success: false,
        status: 500,
        message: error instanceof Error ? error.message : 'Erro ao criar custodiado',
        data: undefined
      };
    }
  },

  async atualizar(
    id: string | number,
    data: Partial<CustodiadoDTO>
  ): Promise<ApiResponse<CustodiadoResponse>> {
    try {
      console.log(`[CustodiadosService] Atualizando custodiado ID: ${id}`, data);

      const response = await apiClient.put<CustodiadoResponse>(`/custodiados/${id}`, data);

      if (response.success) {
        requestCache.clear('custodiados:list');
        requestCache.clear(`custodiados:id:${id}`);
      }

      return response;

    } catch (error) {
      console.error(`[CustodiadosService] Erro ao atualizar custodiado ${id}:`, error);

      return {
        success: false,
        status: 500,
        message: error instanceof Error ? error.message : 'Erro ao atualizar custodiado',
        data: undefined
      };
    }
  },

  async excluir(id: string | number): Promise<ApiResponse<void>> {
    try {
      console.log(`[CustodiadosService] Excluindo custodiado ID: ${id}`);

      const response = await apiClient.delete<void>(`/custodiados/${id}`);

      if (response.success) {
        requestCache.clear('custodiados:list');
        requestCache.clear(`custodiados:id:${id}`);
      }

      return response;

    } catch (error) {
      console.error(`[CustodiadosService] Erro ao excluir custodiado ${id}:`, error);

      return {
        success: false,
        status: 500,
        message: error instanceof Error ? error.message : 'Erro ao excluir custodiado'
      };
    }
  },

  async buscarPorProcesso(
    processo: string,
    options?: { forceRefresh?: boolean; cacheTimeout?: number }
  ): Promise<CustodiadoResponse | null> {
    const cacheKey = `custodiados:processo:${processo}`;
    const cacheTimeout = options?.cacheTimeout || 3 * 60 * 1000;

    if (!options?.forceRefresh) {
      const cached = requestCache.get<CustodiadoResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await apiClient.get<CustodiadoResponse>(
        `/custodiados/processo/${encodeURIComponent(processo)}`
      );

      const result = response.success ? response.data || null : null;

      if (result) {
        requestCache.set(cacheKey, result, cacheTimeout);
      }

      return result;

    } catch (error) {
      console.error(`[CustodiadosService] Erro ao buscar processo ${processo}:`, error);
      return null;
    }
  },

  async buscarPorStatus(
    status: StatusComparecimento,
    options?: { forceRefresh?: boolean; cacheTimeout?: number }
  ): Promise<CustodiadoResponse[]> {
    const cacheKey = `custodiados:status:${status}`;
    const cacheTimeout = options?.cacheTimeout || 2 * 60 * 1000;

    if (!options?.forceRefresh) {
      const cached = requestCache.get<CustodiadoResponse[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await apiClient.get<CustodiadoResponse[]>(
        `/custodiados/status/${status}`
      );

      const result = response.success ? response.data || [] : [];

      if (result.length > 0) {
        requestCache.set(cacheKey, result, cacheTimeout);
      }

      return result;

    } catch (error) {
      console.error(`[CustodiadosService] Erro ao buscar por status ${status}:`, error);
      return [];
    }
  },

  async buscarInadimplentes(options?: {
    forceRefresh?: boolean;
    cacheTimeout?: number;
  }): Promise<CustodiadoResponse[]> {
    const cacheKey = 'custodiados:inadimplentes';
    const cacheTimeout = options?.cacheTimeout || 1 * 60 * 1000;

    if (!options?.forceRefresh) {
      const cached = requestCache.get<CustodiadoResponse[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await apiClient.get<CustodiadoResponse[]>(
        '/custodiados/inadimplentes'
      );

      const result = response.success ? response.data || [] : [];

      requestCache.set(cacheKey, result, cacheTimeout);

      return result;

    } catch (error) {
      console.error('[CustodiadosService] Erro ao buscar inadimplentes:', error);
      return [];
    }
  },

  async buscar(params: BuscarParams): Promise<CustodiadoResponse[]> {
    try {
      const response = await apiClient.get<CustodiadoResponse[]>(
        '/custodiados/buscar',
        params
      );

      return response.success ? response.data || [] : [];

    } catch (error) {
      console.error('[CustodiadosService] Erro na busca:', error);
      return [];
    }
  },

  invalidarCache(): void {
    requestCache.clear('custodiados:list');
    requestCache.clear('custodiados:inadimplentes');
  },

  async precarregar(): Promise<void> {
    try {
      await this.listar();
      await this.buscarInadimplentes();
    } catch (error) {
      console.error('[CustodiadosService] Erro no pré-carregamento:', error);
    }
  },

  estatisticasCache(): {
    listaCacheada: boolean;
    inadimplentesCacheados: boolean;
  } {
    return {
      listaCacheada: requestCache.has('custodiados:list'),
      inadimplentesCacheados: requestCache.has('custodiados:inadimplentes')
    };
  }
};

export const comparecimentosService = {
  async registrar(data: ComparecimentoDTO): Promise<ApiResponse<ComparecimentoResponse>> {
    try {
      const response = await httpClient.post<ComparecimentoResponse>(
        ENDPOINTS.REGISTRAR,
        data
      );

      return {
        success: response.success,
        message: response.message || (response.success ? 'Comparecimento registrado com sucesso' : 'Erro ao registrar comparecimento'),
        data: response.data,
        status: response.status,
        timestamp: response.timestamp || new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao registrar comparecimento',
        status: error.status || 500,
        timestamp: new Date().toISOString()
      };
    }
  },

  async buscarPorCustodiado(custodiadoId: number): Promise<ComparecimentoResponse[]> {
    try {
      const response = await httpClient.get<ComparecimentoResponse[]>(
        ENDPOINTS.CUSTODIADO(custodiadoId)
      );

      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        if ((response.data as any).data && Array.isArray((response.data as any).data)) {
          return (response.data as any).data;
        }
      }

      return [];
    } catch (error: any) {
      console.error('[ComparecimentosService] Erro ao buscar por custodiado:', error);
      return [];
    }
  },

  async buscarPorPeriodo(params: PeriodoParams): Promise<ComparecimentoResponse[]> {
    try {
      const response = await httpClient.get<ComparecimentoResponse[]>(
        ENDPOINTS.PERIODO,
        params
      );

      if (response.success && response.data) {
        if (Array.isArray(response.data)) return response.data;
        if ((response.data as any).data && Array.isArray((response.data as any).data)) {
          return (response.data as any).data;
        }
      }

      return [];
    } catch (error: any) {
      return [];
    }
  },

  async comparecimentosHoje(): Promise<ComparecimentoResponse[]> {
    try {
      const response = await httpClient.get<ComparecimentoResponse[]>(ENDPOINTS.HOJE);

      if (response.success && response.data) {
        if (Array.isArray(response.data)) return response.data;
        if ((response.data as any).data && Array.isArray((response.data as any).data)) {
          return (response.data as any).data;
        }
      }

      return [];
    } catch (error: any) {
      return [];
    }
  },

  async obterEstatisticas(params?: PeriodoParams): Promise<EstatisticasComparecimentoResponse> {
    try {
      const response = await httpClient.get<EstatisticasComparecimentoResponse>(
        ENDPOINTS.ESTATISTICAS,
        params
      );

      if (response.success && response.data) {
        return response.data;
      }

      return {
        totalComparecimentos: 0,
        comparecimentosPresenciais: 0,
        comparecimentosOnline: 0,
        cadastrosIniciais: 0,
        mudancasEndereco: 0,
        mediaDiasEntreMudancas: 0,
        periodo: params ? { dataInicio: params.dataInicio, dataFim: params.dataFim } : undefined
      };
    } catch (error: any) {
      return {
        totalComparecimentos: 0,
        comparecimentosPresenciais: 0,
        comparecimentosOnline: 0,
        cadastrosIniciais: 0,
        mudancasEndereco: 0,
        mediaDiasEntreMudancas: 0
      };
    }
  },

  async obterResumoSistema(): Promise<ResumoSistemaResponse> {
    try {
      const response = await httpClient.get<any>('/comparecimentos/resumo/sistema');

      if (response.success && response.data) {
        if (response.data.data && typeof response.data.data === 'object') {
          return response.data.data as ResumoSistemaResponse;
        }

        if (response.data.totalCustodiados !== undefined) {
          return response.data as ResumoSistemaResponse;
        }

        if (typeof response.data === 'object' && response.data !== null) {
          const possibleData = response.data.data || response.data;
          if (possibleData && possibleData.totalCustodiados !== undefined) {
            return possibleData as ResumoSistemaResponse;
          }
        }
      }

      return {
        totalCustodiados: 0,
        custodiadosEmConformidade: 0,
        custodiadosInadimplentes: 0,
        comparecimentosHoje: 0,
        comparecimentosAtrasados: 0,
        proximosComparecimentos7Dias: 0,
        totalComparecimentos: 0,
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        totalCustodiados: 0,
        custodiadosEmConformidade: 0,
        custodiadosInadimplentes: 0,
        comparecimentosHoje: 0,
        comparecimentosAtrasados: 0,
        proximosComparecimentos7Dias: 0,
        totalComparecimentos: 0,
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  },

  async listarTodos(params?: ListarComparecimentosParams): Promise<ApiResponse<any>> {
    try {
      const queryParams = {
        page: params?.page ?? 0,
        size: params?.size ?? 50
      };

      const response = await httpClient.get<any>(ENDPOINTS.TODOS, queryParams);

      if (response.success && response.data) {
        if (response.data.comparecimentos && Array.isArray(response.data.comparecimentos)) {
          return {
            success: true,
            message: response.message || 'Comparecimentos listados com sucesso',
            data: {
              comparecimentos: response.data.comparecimentos,
              paginaAtual: response.data.paginaAtual ?? 0,
              totalPaginas: response.data.totalPaginas ?? 1,
              totalItens: response.data.totalItens ?? response.data.comparecimentos.length,
              itensPorPagina: response.data.itensPorPagina ?? response.data.comparecimentos.length,
              temProxima: response.data.temProxima ?? false,
              temAnterior: response.data.temAnterior ?? false
            },
            status: response.status,
            timestamp: response.timestamp || new Date().toISOString()
          };
        }

        if (Array.isArray(response.data)) {
          return {
            success: true,
            message: 'Comparecimentos listados com sucesso',
            data: {
              comparecimentos: response.data,
              paginaAtual: queryParams.page,
              totalPaginas: 1,
              totalItens: response.data.length,
              itensPorPagina: response.data.length,
              temProxima: false,
              temAnterior: false
            },
            status: response.status,
            timestamp: response.timestamp || new Date().toISOString()
          };
        }

        if (response.data.data && response.data.data.comparecimentos) {
          const nested = response.data.data;
          return {
            success: true,
            message: response.message || 'Comparecimentos listados com sucesso',
            data: {
              comparecimentos: nested.comparecimentos,
              paginaAtual: nested.paginaAtual ?? 0,
              totalPaginas: nested.totalPaginas ?? 1,
              totalItens: nested.totalItens ?? nested.comparecimentos.length,
              itensPorPagina: nested.itensPorPagina ?? nested.comparecimentos.length,
              temProxima: nested.temProxima ?? false,
              temAnterior: nested.temAnterior ?? false
            },
            status: response.status,
            timestamp: response.timestamp || new Date().toISOString()
          };
        }
      }

      return {
        success: false,
        message: response.message || 'Erro ao listar comparecimentos',
        status: response.status || 500,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao listar comparecimentos',
        status: error.status || 500,
        timestamp: new Date().toISOString()
      };
    }
  },

  async filtrar(params: {
    dataInicio?: string;
    dataFim?: string;
    tipoValidacao?: 'PRESENCIAL' | 'ONLINE' | 'CADASTRO_INICIAL';
    page?: number;
    size?: number;
  }): Promise<ApiResponse<ListarComparecimentosResponse>> {
    try {
      const response = await httpClient.get<any>(ENDPOINTS.FILTRAR, params);

      if (response.success && response.data) {
        if (response.data.comparecimentos) {
          return {
            success: true,
            message: response.message || 'Comparecimentos filtrados com sucesso',
            data: response.data,
            status: response.status,
            timestamp: response.timestamp || new Date().toISOString()
          };
        }

        if (Array.isArray(response.data)) {
          return {
            success: true,
            message: 'Comparecimentos filtrados com sucesso',
            data: {
              comparecimentos: response.data,
              paginaAtual: params?.page || 0,
              totalPaginas: 1,
              totalItens: response.data.length,
              itensPorPagina: response.data.length,
              temProxima: false,
              temAnterior: false
            },
            status: response.status,
            timestamp: response.timestamp || new Date().toISOString()
          };
        }
      }

      return {
        success: false,
        message: response.message || 'Erro ao filtrar comparecimentos',
        status: response.status || 500,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao filtrar comparecimentos',
        status: error.status || 500,
        timestamp: new Date().toISOString()
      };
    }
  }
};

export const usuariosService = {
  async listar(): Promise<UsuarioResponse[]> {
    const response = await apiClient.get<UsuarioResponse[]>('/usuarios');
    return response.success ? response.data || [] : [];
  },

  async criar(data: UsuarioDTO): Promise<ApiResponse<UsuarioResponse>> {
    return await apiClient.post<UsuarioResponse>('/usuarios', data);
  },

  async atualizar(id: number, data: Partial<UsuarioDTO>): Promise<ApiResponse<UsuarioResponse>> {
    const dadosLimpos: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        dadosLimpos[key] = value;
      }
    });
    
    return await apiClient.put<UsuarioResponse>(`/usuarios/${id}`, dadosLimpos);
  }
};

export interface LoginRequest {
  email: string;
  senha: string;
  rememberMe?: boolean;
  forceLogin?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  sessionId: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    tipo: 'ADMIN' | 'USUARIO';
    departamento?: string;
    telefone?: string;
    ultimoLogin: string;
    mfaEnabled: boolean;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
  logoutAllDevices?: boolean;
}

export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
  confirmaSenha: string;
}

export interface ResetSenhaRequest {
  email: string;
}

export interface ConfirmarResetRequest {
  token: string;
  novaSenha: string;
  confirmaSenha: string;
}

export interface ConviteDTO {
  nome: string;
  email: string;
  tipoUsuario: 'ADMIN' | 'USUARIO';
  departamento?: string;
  telefone?: string;
  escopo?: string;
  validadeHoras?: number;
  mensagemPersonalizada?: string;
}

export interface ConviteResponse {
  id: number;
  token: string;
  email: string;
  nome: string;
  tipoUsuario: string;
  linkAtivacao: string;
  expiraEm: string;
  horasValidade: number;
  status: 'PENDENTE' | 'ACEITO' | 'EXPIRADO' | 'CANCELADO';
  criadoPor?: string;
  criadoEm: string;
  aceitoEm?: string;
  departamento?: string;
  telefone?: string;
}

export interface AtivarContaDTO {
  nome?: string;
  token: string;
  senha: string;
  confirmaSenha: string;
  habilitarMFA?: boolean;
}

export interface ReenviarConviteDTO {
  novaValidadeHoras?: number;
  mensagemPersonalizada?: string;
}

export const convitesService = {
  async criarConvite(data: ConviteDTO): Promise<ApiResponse<ConviteResponse>> {
    try {
      const response = await apiClient.post<ConviteResponse>(
        '/usuarios/convites', 
        data,
        { timeout: 10000 }
      );
      
      if (response.success || response.status === 201) {
        return {
          ...response,
          success: true,
          message: response.message || 'Convite criado! O email será enviado em breve.',
          status: response.status || 201
        };
      }
      
      return response;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: true,
          status: 202,
          message: 'Convite está sendo processado. O email será enviado em breve.',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: false,
        status: error.status || 500,
        message: error.message || 'Erro ao criar convite',
        timestamp: new Date().toISOString()
      };
    }
  },

  async listarConvites(status?: string): Promise<ApiResponse<ConviteResponse[]>> {
    const params = status ? { status } : undefined;
    return await apiClient.get<ConviteResponse[]>('/usuarios/convites', params);
  },

  async validarToken(token: string): Promise<ApiResponse<ValidarConviteResponse>> {
    return await apiClient.get<ValidarConviteResponse>(`/usuarios/convites/validar/${token}`);
  },

  async ativarConta(data: AtivarContaDTO): Promise<ApiResponse<{
    id: number;
    email: string;
    nome: string;
    tipo: string;
  }>> {
    return await apiClient.post('/usuarios/convites/ativar', data);
  },

  async reenviarConvite(id: number, data: ReenviarConviteDTO): Promise<ApiResponse<ConviteResponse>> {
    return await apiClient.post<ConviteResponse>(`/usuarios/convites/${id}/reenviar`, data);
  },

  async cancelarConvite(id: number, motivo?: string): Promise<ApiResponse<void>> {
    if (motivo) {
      return await apiClient.post<void>(`/usuarios/convites/${id}/cancelar`, { motivo });
    }
    return await apiClient.delete<void>(`/usuarios/convites/${id}`);
  }
};

export const authService = {
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      return await apiClient.post<LoginResponse>('/auth/login', data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          success: false,
          status: 401,
          message: error.response?.data?.message || 'Email ou senha incorretos',
          error: error.response?.data
        };
      }
      throw error;
    }
  },

  async logout(data?: LogoutRequest): Promise<ApiResponse<void>> {
    try {
      return await apiClient.post<void>('/auth/logout', data || {});
    } catch (error: any) {
      return { success: true, status: 200 };
    }
  },

  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      return await apiClient.post<LoginResponse>('/auth/refresh', data);
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status || 500,
        message: error.response?.data?.message || 'Erro ao renovar token',
        error: error.response?.data
      };
    }
  },

  async validateToken(): Promise<ApiResponse<{
    valid: boolean;
    email?: string;
    expiration?: string;
    authorities?: string[];
    message?: string;
  }>> {
    try {
      return await apiClient.get<{
        valid: boolean;
        email?: string;
        expiration?: string;
        authorities?: string[];
        message?: string;
      }>('/auth/validate');
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status || 401,
        data: { valid: false, message: 'Token inválido' }
      };
    }
  },

  async alterarSenha(data: AlterarSenhaRequest): Promise<ApiResponse<void>> {
    try {
      return await apiClient.post<void>('/auth/change-password', data);
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status || 500,
        message: error.response?.data?.message || 'Erro ao alterar senha',
        error: error.response?.data
      };
    }
  },

  async getProfile(): Promise<ApiResponse<UsuarioResponse>> {
    try {
      const response = await apiClient.get<any>('/auth/me');

      if (response.success && response.data) {
        return {
          success: true,
          status: response.status,
          data: response.data.data || response.data
        };
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status || 500,
        message: error.response?.data?.message || 'Erro ao obter perfil',
        error: error.response?.data
      };
    }
  }
};

export const statusService = {
  async verificarInadimplentes(): Promise<ApiResponse<StatusVerificacaoResponse>> {
    return await apiClient.post<StatusVerificacaoResponse>('/status/verificar-inadimplentes');
  },

  async obterEstatisticas(): Promise<StatusEstatisticasResponse | null> {
    const response = await apiClient.get<StatusEstatisticasResponse>('/status/estatisticas');
    return response.success ? response.data || null : null;
  }
};

export const setupService = {
  async getStatus(): Promise<SetupStatusResponse> {
    const response = await apiClient.get<SetupStatusResponse>(
      '/setup/status',
      undefined,
      { requireAuth: false }
    );

    return response.data || {
      setupRequired: true,
      setupCompleted: false,
      configured: false,
      timestamp: new Date().toISOString()
    };
  },

  async createAdmin(data: SetupAdminDTO): Promise<ApiResponse<any>> {
    return await apiClient.post('/setup/admin', data, {
      requireAuth: false
    });
  }
};

export const testService = {
  async health(): Promise<HealthResponse> {
    try {
      const response = await apiClient.get<any>(
        '/custodiados',
        undefined,
        { requireAuth: false }
      );

      if (response.success || response.status === 200) {
        return {
          status: 'UP',
          timestamp: new Date().toISOString(),
          details: { message: 'API respondendo normalmente' }
        };
      }
    } catch (error) {
      console.error('[TestService] Erro no health check:', error);
    }

    try {
      const response = await apiClient.get<any>(
        '/status/info',
        undefined,
        { requireAuth: false }
      );

      if (response.success) {
        return {
          status: 'UP',
          timestamp: response.data?.timestamp || new Date().toISOString(),
          details: response.data
        };
      }
    } catch (error) {
      console.error('[TestService] Fallback health check falhou:', error);
    }

    return {
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      details: { error: 'API não está respondendo' }
    };
  },

  async info(): Promise<AppInfoResponse> {
    try {
      const response = await apiClient.get<AppInfoResponse>(
        '/setup/health',
        undefined,
        { requireAuth: false }
      );

      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.log(`[TestService] Actuator/info não disponível${error}`);
    }

    try {
      const statusResponse = await apiClient.get<any>(
        '/status/info',
        undefined,
        { requireAuth: false }
      );
      
      if (statusResponse.success) {
        return {
          name: 'Sistema de Controle de Comparecimento',
          version: '1.0.0',
          description: statusResponse.data?.descricao || 'Sistema de atualização automática de status',
          environment: process.env.NODE_ENV || 'development',
          buildTime: statusResponse.data?.timestamp || new Date().toISOString(),
          javaVersion: 'N/A',
          springBootVersion: 'N/A'
        };
      }
    } catch (error) {
      console.error('[TestService] Status/info também falhou:', error);
    }

    return {
      name: 'Sistema de Controle de Comparecimento',
      version: '1.0.0',
      description: 'Sistema de Controle de Liberdade Provisória',
      environment: process.env.NODE_ENV || 'development',
      buildTime: new Date().toISOString(),
      javaVersion: 'N/A',
      springBootVersion: 'N/A'
    };
  }
};
