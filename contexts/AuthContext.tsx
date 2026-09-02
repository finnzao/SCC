/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api/authService';
import { logger } from '@/lib/utils/logger';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'USUARIO';
  departamento?: string;
  telefone?: string;
  ultimoLogin?: string;
}

export interface LoginResult {
  success: boolean;
  /** Mensagem do servidor quando houver — ex.: excesso de tentativas (429). */
  message?: string;
}

interface AuthContextType {
  user: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Retorna o motivo da falha, não só um booleano. O backend distingue credencial
   * inválida (401) de excesso de tentativas (429), e a tela precisa dizer qual foi:
   * mostrar "verifique suas credenciais" para quem está bloqueado faz a pessoa
   * insistir e prolongar o bloqueio.
   */
  login: (email: string, senha: string, rememberMe?: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logAction: (action: string, resource: string, details?: Record<string, any>) => void;
}

interface PermissionsContextType {
  hasPermission: (resource: string, action: string) => boolean;
  isAdmin: () => boolean;
  isUsuario: () => boolean;
  getUserPermissions: () => string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/invite', '/recuperar-senha', '/redefinir-senha'];
const isPublicRoute = (pathname: string): boolean => PUBLIC_ROUTES.some(route => pathname.startsWith(route));

const PERMISSIONS = {
  ADMIN: {
    pessoas: ['listar', 'visualizar', 'cadastrar', 'editar', 'excluir', 'exportar'],
    comparecimentos: ['listar', 'visualizar', 'registrar', 'editar', 'cancelar', 'exportar'],
    sistema: ['configurar', 'gerenciarUsuarios', 'backup', 'logs'],
    relatorios: ['visualizar', 'gerar', 'exportar'],
    biometria: ['cadastrar', 'verificar', 'gerenciar'],
  },
  USUARIO: {
    pessoas: ['listar', 'visualizar', 'exportar'],
    comparecimentos: ['listar', 'visualizar', 'registrar', 'exportar'],
    sistema: [] as string[],
    relatorios: ['visualizar', 'exportar'],
    biometria: ['verificar'],
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const isAuthenticated = !!user;

  const clearAuthData = useCallback(() => {
    logger.log('[AuthContext] Limpando dados de autenticação');
    authService.clearAuth();
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    if (typeof window !== 'undefined' && isPublicRoute(window.location.pathname)) {
      logger.log('[AuthContext] Em rota pública, não carregando usuário');
      setIsLoading(false);
      return;
    }

    try {
      // token e httpOnly: quem valida a sessao e o backend via /auth/perfil
      const profileResponse = await authService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data || profileResponse.data;
        setUser({
          id: userData.id, nome: userData.nome, email: userData.email, tipo: userData.tipo,
          departamento: userData.departamento, telefone: userData.telefone, ultimoLogin: userData.ultimoLogin,
        });
      } else {
        clearAuthData();
      }
    } catch (error: any) {
      logger.error('[AuthContext] Erro ao carregar usuário:', error);
      if (error.message?.includes('401') || error.message?.includes('expirada')) clearAuthData();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthData]);

  useEffect(() => {
    const handleTokenExpired = () => {
      logger.log('[AuthContext] Evento de token expirado recebido');
      clearAuthData();
      router.push('/login');
    };
    window.addEventListener('token-expired', handleTokenExpired);
    return () => window.removeEventListener('token-expired', handleTokenExpired);
  }, [router, clearAuthData]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, senha: string, rememberMe = false): Promise<LoginResult> => {
    try {
      logger.log('[AuthContext] Iniciando login para:', email);
      const result = await authService.login({ email, senha, rememberMe });
      if (result.success && result.data) {
        setUser({
          id: result.data.usuario.id, nome: result.data.usuario.nome, email: result.data.usuario.email,
          tipo: result.data.usuario.tipo, departamento: result.data.usuario.departamento,
          telefone: result.data.usuario.telefone, ultimoLogin: result.data.usuario.ultimoLogin,
        });
        return { success: true };
      }
      // A mensagem vem do backend e é segura de exibir: em falha de credencial ele
      // devolve texto constante ("Credenciais inválidas") justamente para não virar
      // oráculo de enumeração de contas.
      return { success: false, message: result.message };
    } catch (error: any) {
      logger.error('[AuthContext] Erro no login:', error);
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      // so o backend apaga o cookie httpOnly e revoga a sessao
      await authService.logout({ refreshToken: '' });
    } catch {
      /* falha de rede não pode impedir o logout local */
    } finally {
      clearAuthData();
      router.push('/login');
    }
  };

  const refreshUser = async () => { await loadUser(); };

  const logAction = (action: string, resource: string, details?: Record<string, any>) => {
    if (!user) return;
    const logEntry = { timestamp: new Date().toISOString(), userId: user.id, userName: user.nome, userType: user.tipo, action, resource, details: details || {} };
    logger.log('[Audit]', logEntry);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
        auditLogs.push(logEntry);
        if (auditLogs.length > 1000) auditLogs.shift();
        localStorage.setItem('audit_logs', JSON.stringify(auditLogs));
      } catch { /* ignore */ }
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    const userPermissions = user.tipo === 'ADMIN' ? PERMISSIONS.ADMIN : PERMISSIONS.USUARIO;
    const resourcePermissions = userPermissions[resource as keyof typeof userPermissions] || [];
    return resourcePermissions.includes(action);
  };

  const isAdmin = (): boolean => user?.tipo === 'ADMIN';
  const isUsuario = (): boolean => user?.tipo === 'USUARIO';

  const getUserPermissions = (): string[] => {
    if (!user) return [];
    const userPermissions = user.tipo === 'ADMIN' ? PERMISSIONS.ADMIN : PERMISSIONS.USUARIO;
    const allPermissions: string[] = [];
    Object.entries(userPermissions).forEach(([resource, actions]) => {
      actions.forEach(action => allPermissions.push(`${resource}:${action}`));
    });
    return allPermissions;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, refreshUser, logAction }}>
      <PermissionsContext.Provider value={{ hasPermission, isAdmin, isUsuario, getUserPermissions }}>
        {children}
      </PermissionsContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}

export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (context === undefined) throw new Error('usePermissions deve ser usado dentro de um AuthProvider');
  return context;
}
