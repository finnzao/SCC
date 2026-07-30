/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpClient as api } from '@/lib/http/client';
import { ApiResponse } from '@/types/api';

// ========== TIPOS ESPECÍFICOS PARA ATIVAÇÃO ==========

/**
 * DTO para ativar conta
 */
export interface AtivarContaDTO {
  token: string;
  senha: string;
  confirmaSenha: string;
  aceitouTermos: boolean;
}

/**
 * Resposta da ativação de conta
 */
export interface AtivarContaResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    nome: string;
    email: string;
    tipo: 'ADMIN' | 'USUARIO';
  };
}

/**
 * DTO para solicitar novo convite
 */
export interface SolicitarNovoConviteDTO {
  email: string;
  motivo?: string;
}

/**
 * Resposta da validação de token
 */
export interface ValidarTokenResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    nome: string;
    email: string;
    tipo: 'ADMIN' | 'USUARIO';
    departamento?: string;
    criadoPor: string;
    criadoEm: string;
    expiraEm: string;
    status: 'PENDENTE' | 'ACEITO' | 'EXPIRADO' | 'CANCELADO';
  };
}

/**
 * Tipo para ativação de conta (mesmo que AtivarContaDTO)
 */
export type AtivarConta = AtivarContaDTO;

/**
 * Resposta de verificação de convite
 */
export interface VerificarConviteResponse {
  temConvite: boolean;
  status?: string;
  expiraEm?: string;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Extrai mensagem de erro de unknown
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as any).response;
    if (response?.data?.message) {
      return String(response.data.message);
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro desconhecido';
}

/**
 * Verifica se é erro com status HTTP específico
 */
function isErrorWithStatus(error: unknown, status: number): boolean {
  return !!(
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as any).response?.status === status
  );
}

// ========== SERVIÇO DE ATIVAÇÃO ==========

export const ativacaoService = {
  /**
   * Validar token de ativação
   * @param token Token recebido por email
   */
  validarToken: async (token: string): Promise<ValidarTokenResponse> => {
    try {
      const response = await api.get<ValidarTokenResponse>(`/api/convites/validar/${token}`);
      return response.data ?? { success: false, message: 'Erro desconhecido' };
    } catch (error: unknown) {
      console.error('[ativacaoService] Erro ao validar token:', error);

      // Tratar erros específicos
      if (isErrorWithStatus(error, 404)) {
        return {
          success: false,
          message: 'Token de ativação não encontrado ou inválido'
        };
      }

      if (isErrorWithStatus(error, 410)) {
        return {
          success: false,
          message: 'Este convite já expirou'
        };
      }

      return {
        success: false,
        message: getErrorMessage(error) || 'Erro ao validar token'
      };
    }
  },

  /**
   * Ativar conta com nova senha
   * @param data Dados para ativação
   */
  ativarConta: async (data: AtivarConta): Promise<AtivarContaResponse> => {
    try {
      // Validações locais antes de enviar
      if (data.senha !== data.confirmaSenha) {
        return {
          success: false,
          message: 'As senhas não coincidem'
        };
      }

      // Política completa, não só tamanho: o backend recusa senha sem maiúscula,
      // minúscula, número ou caractere especial, e sem isto o usuário só descobriria
      // no erro do servidor.
      const forcaSenha = validarForcaSenha(data.senha);
      if (!forcaSenha.valida) {
        return {
          success: false,
          message: `A senha não atende aos requisitos: ${forcaSenha.problemas.join(', ')}`
        };
      }

      if (!data.aceitouTermos) {
        return {
          success: false,
          message: 'Você deve aceitar os termos de uso'
        };
      }

      // Validação adicional de senha forte
      if (!/[A-Z]/.test(data.senha)) {
        return {
          success: false,
          message: 'A senha deve conter pelo menos uma letra maiúscula'
        };
      }

      if (!/[a-z]/.test(data.senha)) {
        return {
          success: false,
          message: 'A senha deve conter pelo menos uma letra minúscula'
        };
      }

      if (!/[0-9]/.test(data.senha)) {
        return {
          success: false,
          message: 'A senha deve conter pelo menos um número'
        };
      }

      const response = await api.post<AtivarContaResponse>('/api/usuarios/ativar', {
        token: data.token,
        senha: data.senha,
        confirmaSenha: data.confirmaSenha,
        aceitouTermos: data.aceitouTermos
      });

      return response.data ?? { success: false, message: 'Erro desconhecido' };
    } catch (error: unknown) {
      console.error('[ativacaoService] Erro ao ativar conta:', error);

      return {
        success: false,
        message: getErrorMessage(error) || 'Erro ao ativar conta'
      };
    }
  },

  /**
   * Solicitar reenvio de convite
   * @param data Email e motivo opcional
   */
  solicitarNovoConvite: async (data: SolicitarNovoConviteDTO): Promise<ApiResponse> => {
    try {
      const response = await api.post<ApiResponse>('/api/convites/solicitar-reenvio', data);
      return response.data ?? { 
        success: false, 
        message: 'Erro desconhecido', 
        timestamp: new Date().toISOString() 
      };
    } catch (error: unknown) {
      console.error('[ativacaoService] Erro ao solicitar novo convite:', error);

      return {
        success: false,
        message: getErrorMessage(error) || 'Erro ao solicitar novo convite',
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Verificar se email tem convite pendente
   * @param email Email para verificar
   */
  verificarConvitePendente: async (email: string): Promise<VerificarConviteResponse> => {
    try {
      const response = await api.get(`/api/convites/verificar/${encodeURIComponent(email)}`);
      const data = response.data ?? { temConvite: false };
      
      return {
        temConvite: Boolean((data as any).temConvite),
        status: (data as any).status,
        expiraEm: (data as any).expiraEm
      };
    } catch (error: unknown) {
      console.error('[ativacaoService] Erro ao verificar convite:', error);
      return { temConvite: false };
    }
  },

  /**
   * Cancelar convite (admin only)
   * @param tokenOuId Token ou ID do convite
   */
  cancelarConvite: async (tokenOuId: string): Promise<ApiResponse> => {
    try {
      const response = await api.delete<ApiResponse>(`/api/convites/${tokenOuId}`);
      return response.data ?? { 
        success: false, 
        message: 'Erro desconhecido', 
        timestamp: new Date().toISOString() 
      };
    } catch (error: unknown) {
      console.error('[ativacaoService] Erro ao cancelar convite:', error);

      return {
        success: false,
        message: getErrorMessage(error) || 'Erro ao cancelar convite',
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Reenviar email de convite (admin only)
   * @param conviteId ID do convite
   */
  reenviarConvite: async (conviteId: string): Promise<ApiResponse> => {
    try {
      const response = await api.post<ApiResponse>(`/api/convites/${conviteId}/reenviar`);
      return response.data ?? { 
        success: false, 
        message: 'Erro desconhecido', 
        timestamp: new Date().toISOString() 
      };
    } catch (error: unknown) {
      console.error('[ativacaoService] Erro ao reenviar convite:', error);

      return {
        success: false,
        message: getErrorMessage(error) || 'Erro ao reenviar convite',
        timestamp: new Date().toISOString()
      };
    }
  }
};

// ========== HOOK CUSTOMIZADO ==========

import { useState, useCallback } from 'react';

/**
 * Estado do hook de ativação
 */
interface UseAtivacaoState {
  loading: boolean;
  error: string | null;
  validarToken: (token: string) => Promise<ValidarTokenResponse | null>;
  ativarConta: (data: AtivarConta) => Promise<AtivarContaResponse | null>;
  limparErro: () => void;
}

/**
 * Hook customizado para usar na tela de ativação
 */
export function useAtivacao(): UseAtivacaoState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limparErro = useCallback(() => {
    setError(null);
  }, []);

  const validarToken = useCallback(async (token: string): Promise<ValidarTokenResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await ativacaoService.validarToken(token);

      if (!result.success) {
        setError(result.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar token';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const ativarConta = useCallback(async (data: AtivarConta): Promise<AtivarContaResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await ativacaoService.ativarConta(data);

      if (!result.success) {
        setError(result.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao ativar conta';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    validarToken,
    ativarConta,
    limparErro
  };
}

// ========== VALIDADORES ==========

/**
 * Validar força da senha
 */
export function validarForcaSenha(senha: string): {
  valida: boolean;
  forca: 'fraca' | 'media' | 'forte';
  problemas: string[];
} {
  const problemas: string[] = [];
  let pontos = 0;

  if (senha.length < 8) {
    problemas.push('Mínimo de 8 caracteres');
  } else {
    pontos++;
  }

  if (!/[A-Z]/.test(senha)) {
    problemas.push('Pelo menos uma letra maiúscula');
  } else {
    pontos++;
  }

  if (!/[a-z]/.test(senha)) {
    problemas.push('Pelo menos uma letra minúscula');
  } else {
    pontos++;
  }

  if (!/[0-9]/.test(senha)) {
    problemas.push('Pelo menos um número');
  } else {
    pontos++;
  }

  // Qualquer caractere não alfanumérico serve, igual ao backend. A lista fechada
  // anterior reprovava símbolos válidos como '_' e '-'.
  if (!/[^a-zA-Z0-9]/.test(senha)) {
    problemas.push('Pelo menos um caractere especial');
  } else {
    pontos++;
  }

  let forca: 'fraca' | 'media' | 'forte' = 'fraca';
  if (pontos >= 4) forca = 'forte';
  else if (pontos >= 3) forca = 'media';

  return {
    valida: problemas.length === 0,
    forca,
    problemas
  };
}

/**
 * Validar formato de email
 */
export function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ========== EXPORTS ==========

export default ativacaoService;