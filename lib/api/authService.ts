/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpClient } from '@/lib/http/client';
import { logger } from '@/lib/utils/logger';

interface LoginRequest {
  email: string;
  senha: string;
  rememberMe?: boolean;
}

interface LoginResponseData {
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
    avatar?: string | null;
    ultimoLogin?: string;
    mfaEnabled: boolean;
  };
  requiresMfa: boolean;
  requiresPasswordChange: boolean;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RefreshTokenResponseData {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface LogoutRequest {
  refreshToken: string;
}

interface GetProfileResponseData {
  success: boolean;
  data: {
    id: number;
    nome: string;
    email: string;
    tipo: 'ADMIN' | 'USUARIO';
    departamento?: string;
    telefone?: string;
    ativo: boolean;
    criadoEm: string;
    ultimoLogin?: string;
  };
}

interface UpdateProfileRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  departamento?: string;
}

interface ChangePasswordRequest {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

interface TokenPayload {
  userId: number;
  email: string;
  nome: string;
  tipo: 'ADMIN' | 'USUARIO';
  roles: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
}

function extractResponseData<T>(response: any): T | null {
  if (response && typeof response === 'object') {
    if ('data' in response && response.data) return response.data as T;
    return response as T;
  }
  return null;
}

function isSuccessResponse(response: any): boolean {
  if (!response) return false;
  if ('success' in response) return response.success === true;
  if ('data' in response && response.data && typeof response.data === 'object') {
    if ('success' in response.data) return response.data.success === true;
  }
  return true;
}

class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access-token';
  private readonly REFRESH_TOKEN_KEY = 'refresh-token';
  private readonly USER_KEY = 'user-data';

  async login(credentials: LoginRequest): Promise<{ success: boolean; data?: LoginResponseData; message?: string }> {
    logger.log('[AuthService] Realizando login:', credentials.email);

    try {
      const response = await httpClient.post<any>('/auth/login', {
        email: credentials.email,
        senha: credentials.senha,
        rememberMe: credentials.rememberMe,
      }, { requireAuth: false });

      logger.log('[AuthService] Resposta do login:', response);

      if (!isSuccessResponse(response)) {
        return { success: false, message: response?.message || 'Erro ao realizar login' };
      }

      const loginData = extractResponseData<LoginResponseData>(response);
      if (!loginData) {
        logger.error('[AuthService] Não foi possível extrair dados da resposta');
        return { success: false, message: 'Estrutura de resposta inválida' };
      }

      if (!loginData.accessToken || !loginData.refreshToken || !loginData.usuario) {
        logger.error('[AuthService] Resposta sem campos obrigatórios');
        return { success: false, message: 'Resposta incompleta do servidor' };
      }

      // Os tokens vieram como cookies httpOnly no Set-Cookie da resposta; o corpo ainda os
      // traz por retrocompatibilidade, mas não guardamos nada disso em JS.
      logger.log('[AuthService] Login bem-sucedido');
      this.setUserData(loginData.usuario);

      return { success: true, data: loginData };
    } catch (error: any) {
      logger.error('[AuthService] Erro no login:', error);
      return { success: false, message: error.message || 'Erro ao conectar com o servidor' };
    }
  }

  async refreshToken(request: RefreshTokenRequest): Promise<{ success: boolean; data?: RefreshTokenResponseData }> {
    logger.log('[AuthService] Renovando token');

    try {
      const response = await httpClient.post<any>('/auth/refresh', request, { requireAuth: false });
      if (!isSuccessResponse(response)) return { success: false };

      const refreshData = extractResponseData<RefreshTokenResponseData>(response);

      // Sucesso é o 2xx: os cookies renovados já vieram no Set-Cookie da resposta.
      logger.log('[AuthService] Token renovado com sucesso');
      return { success: true, data: refreshData ?? undefined };
    } catch (error) {
      logger.error('[AuthService] Erro ao renovar token:', error);
      return { success: false };
    }
  }

  async logout(request: LogoutRequest): Promise<void> {
    logger.log('[AuthService] Realizando logout');
    try {
      await httpClient.post('/auth/logout', request);
    } catch (error) {
      logger.error('[AuthService] Erro no logout:', error);
    } finally {
      this.clearAuth();
    }
  }

  async getProfile(): Promise<GetProfileResponseData> {
    logger.log('[AuthService] Buscando perfil do usuário');
    try {
      const response = await httpClient.get<any>('/auth/perfil');
      const profileData = extractResponseData<GetProfileResponseData>(response);
      if (!profileData) throw new Error('Dados de perfil não encontrados');
      return profileData;
    } catch (error) {
      logger.error('[AuthService] Erro ao buscar perfil:', error);
      throw error;
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<{ success: boolean; message?: string; data?: any }> {
    logger.log('[AuthService] Atualizando perfil');
    try {
      const response = await httpClient.put<any>('/auth/perfil', data);
      return { success: isSuccessResponse(response), message: response?.message, data: response?.data };
    } catch (error: any) {
      logger.error('[AuthService] Erro ao atualizar perfil:', error);
      return { success: false, message: error.message || 'Erro ao atualizar perfil' };
    }
  }

  async alterarSenha(data: ChangePasswordRequest): Promise<{ success: boolean; message?: string }> {
    logger.log('[AuthService] Alterando senha');
    try {
      const response = await httpClient.put<any>('/auth/perfil/senha', data);
      return { success: isSuccessResponse(response), message: response?.message };
    } catch (error: any) {
      logger.error('[AuthService] Erro ao alterar senha:', error);
      return { success: false, message: error.message || 'Erro ao alterar senha' };
    }
  }

  async validateToken(): Promise<{ success: boolean }> {
    logger.log('[AuthService] Validando token');
    try {
      const response = await httpClient.get<any>('/auth/validate');
      return extractResponseData(response) || { success: false };
    } catch (error) {
      logger.error('[AuthService] Erro ao validar token:', error);
      return { success: false };
    }
  }

  async desativarConta(): Promise<{ success: boolean; message?: string }> {
    logger.log('[AuthService] Desativando conta');
    try {
      const response = await httpClient.delete<any>('/auth/perfil');
      if (isSuccessResponse(response)) this.clearAuth();
      return { success: isSuccessResponse(response), message: response?.message };
    } catch (error: any) {
      logger.error('[AuthService] Erro ao desativar conta:', error);
      return { success: false, message: error.message || 'Erro ao desativar conta' };
    }
  }

  /**
   * Os tokens deixaram de existir no JavaScript: vivem em cookies httpOnly emitidos pelo
   * backend, que o script da página não consegue ler nem gravar. Estes métodos viraram
   * no-op/null de propósito — mantidos para não quebrar quem os chama, mas guardar o token
   * de novo em localStorage reabriria o roubo por XSS que esta mudança fechou.
   */
  setAccessToken(_token: string): void {
    /* no-op: o cookie httpOnly é a única fonte do token */
  }

  getAccessToken(): string | null {
    return null; // inacessível ao JS por design
  }
  // eslint-disable-next-line no-unused-vars
  setRefreshToken(_token: string): void {
    /* no-op: cookie httpOnly restrito a /api/auth */
  }

  getRefreshToken(): string | null {
    return null; // inacessível ao JS por design
  }

  setUserData(usuario: any): void {
    if (typeof window !== 'undefined') localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
  }

  getUserData(): any | null {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  clearAuth(): void {
    logger.log('[AuthService] Limpando dados de autenticação');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    httpClient.clearAuthToken();
  }

  /**
   * Presença de sessão, não prova de sessão: o token httpOnly não é legível daqui.
   * Serve só para decidir o que renderizar — a autorização real é do backend.
   */
  isAuthenticated(): boolean {
    return !!this.getUserData();
  }

  // isAdmin() foi removido: lia `tipo` do localStorage, que o próprio usuário edita
  // (localStorage.setItem('user-data', '{"tipo":"ADMIN"}') e virava admin). Para decisão
  // de UI use o `user` do AuthContext, que vem de GET /auth/perfil.

  decodeToken(token: string): TokenPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      logger.error('[AuthService] Erro ao decodificar token:', error);
      return null;
    }
  }

  // isTokenExpiring()/getTokenExpirationTime() foram removidos: dependiam de ler o token
  // no JS. A expiração agora é tratada onde ela de fato importa — o backend responde 401
  // e o httpClient renova via cookie de refresh automaticamente.
}

export const authService = new AuthService();

export function configureAuthHeaders(token: string): void {
  httpClient.setAuthToken(token);
}

export function clearAuthHeaders(): void {
  httpClient.clearAuthToken();
}
