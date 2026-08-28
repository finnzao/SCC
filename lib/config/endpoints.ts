/* eslint-disable @typescript-eslint/no-explicit-any */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
} as const;

export const ENDPOINTS = {
  // Setup Controller
  SETUP: {
    STATUS: '/setup/status',
    CREATE_ADMIN: '/setup/admin',
    AUDIT: '/setup/audit',
    RESET: '/setup/reset',
    HEALTH: '/setup/health',
  },

  // Email Verification
  VERIFICACAO: {
    SOLICITAR_CODIGO: '/verificacao/solicitar-codigo',
    VERIFICAR_CODIGO: '/verificacao/verificar-codigo',
    STATUS: '/verificacao/status',
    REENVIAR_CODIGO: '/verificacao/reenviar-codigo',
    VALIDAR_TOKEN: '/verificacao/validar-token',
    HEALTH: '/verificacao/health',
  },

  // Custodiados Controller
  CUSTODIADOS: {
    BASE: '/custodiados',
    LIST: '/custodiados',
    CREATE: '/custodiados',
    BY_ID: (id: number) => `/custodiados/${id}`,
    UPDATE: (id: number) => `/custodiados/${id}`,
    DELETE: (id: number) => `/custodiados/${id}`,
    BY_PROCESSO: (processo: string) => `/custodiados/processo/${encodeURIComponent(processo)}`,
    BY_STATUS: (status: string) => `/custodiados/status/${status}`,
    INADIMPLENTES: '/custodiados/inadimplentes',
    BUSCAR: (termo: string) => `/custodiados/buscar?termo=${encodeURIComponent(termo)}`,
  },

  // Comparecimentos Controller
  COMPARECIMENTOS: {
    BASE: '/comparecimentos',
    CREATE: '/comparecimentos',
    BY_CUSTODIADO: (custodiadoId: number) => `/comparecimentos/custodiado/${custodiadoId}`,
    BY_PERIODO: '/comparecimentos/periodo',
    HOJE: '/comparecimentos/hoje',
    ESTATISTICAS: '/comparecimentos/estatisticas',
    RESUMO_SISTEMA: '/comparecimentos/resumo/sistema',
  },

  // Histórico Endereços
  HISTORICO_ENDERECOS: {
    BY_PESSOA: (pessoaId: number) => `/historico-enderecos/pessoa/${pessoaId}`,
    ENDERECO_ATIVO: (pessoaId: number) => `/historico-enderecos/pessoa/${pessoaId}/ativo`,
  },

  // Usuários Controller
  USUARIOS: {
    BASE: '/usuarios',
    LIST: '/usuarios',
    CREATE: '/usuarios',
    BY_ID: (id: number) => `/usuarios/${id}`,
    UPDATE: (id: number) => `/usuarios/${id}`,
    DELETE: (id: number) => `/usuarios/${id}`,
    BY_TIPO: (tipo: string) => `/usuarios/tipo/${tipo}`,
  },

  // Status e Monitoramento
  STATUS: {
    VERIFICAR_INADIMPLENTES: '/status/verificar-inadimplentes',
    ESTATISTICAS: '/status/estatisticas',
  },

  // Test Controller
  TEST: {
    HEALTH: '/test/health',
    INFO: '/test/info',
  },

  // Setup Views
  SETUP_VIEWS: {
    SETUP: '/setup',
    SUCCESS: '/setup/success',
  },
} as const;

// Tipos de Status
export const STATUS_COMPARECIMENTO = {
  EM_CONFORMIDADE: 'EM_CONFORMIDADE',
  INADIMPLENTE: 'INADIMPLENTE',
} as const;

// Tipos de Validação
export const TIPO_VALIDACAO = {
  PRESENCIAL: 'PRESENCIAL',
  ONLINE: 'ONLINE',
  CADASTRO_INICIAL: 'CADASTRO_INICIAL',
} as const;

// Tipos de Usuário
export const TIPO_USUARIO = {
  ADMIN: 'ADMIN',
  USUARIO: 'USUARIO',
} as const;

// Construir URL completa
export const buildUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

// Logs condicionais
export const apiLog = (message: string, data?: any) => {
  if (API_CONFIG.IS_DEVELOPMENT) {
    console.log(`[API] ${message}`, data || '');
  }
};