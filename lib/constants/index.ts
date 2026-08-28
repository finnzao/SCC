export const STATUS_COLORS = {
  'em conformidade': {
    bg: 'bg-secondary',
    text: 'text-white',
    border: 'border-secondary'
  },
  'inadimplente': {
    bg: 'bg-danger',
    text: 'text-white',
    border: 'border-danger'
  }
} as const;

export const STATUS_LABELS = {
  'em conformidade': 'Em Conformidade',
  'inadimplente': 'Inadimplente'
} as const;

// Configurações padrão de periodicidade em dias
export const PERIODICIDADES_PADROES = {
  SEMANAL: 7,
  QUINZENAL: 15,
  MENSAL: 30,
  BIMENSAL: 60,
  TRIMESTRAL: 90,
  SEMESTRAL: 180
} as const;

// Labels para periodicidade
export const PERIODICIDADE_LABELS: Record<number, string> = {
  7: 'Semanal (7 dias)',
  15: 'Quinzenal (15 dias)',
  30: 'Mensal (30 dias)',
  60: 'Bimensal (60 dias)',
  90: 'Trimestral (90 dias)',
  180: 'Semestral (180 dias)'
};

export const VALIDATION_TYPES = {
  'presencial': 'Presencial',
  'virtual': 'Virtual',
} as const;

export const MESSAGES = {
  SUCCESS: {
    SAVE: 'Dados salvos com sucesso!',
    UPDATE: 'Dados atualizados com sucesso!',
    DELETE: 'Registro excluído com sucesso!',
    VALIDATION: 'Comparecimento validado com sucesso!'
  },
  ERROR: {
    GENERIC: 'Ocorreu um erro inesperado',
    NETWORK: 'Erro de conexão com o servidor',
    VALIDATION: 'Dados inválidos fornecidos',
    NOT_FOUND: 'Registro não encontrado'
  },
  CONFIRMATION: {
    DELETE: 'Tem certeza que deseja excluir este registro?',
    SAVE: 'Deseja salvar as alterações?'
  }
} as const;

export const ROUTES = {
  DASHBOARD: '/dashboard',
  GENERAL: '/dashboard/geral',
  REGISTER: '/dashboard/registrar',
  SETTINGS: '/dashboard/configuracoes',
  MANUAL_VALIDATION: '/dashboard/validacao-manual',
  FACIAL_CONFIRMATION: '/dashboard/comparecimento/confirmar',
  JUSTIFY: '/dashboard/comparecimento/justificar',
  LOGIN: '/login'
} as const;

export const API_ENDPOINTS = {
  BASE: process.env.NEXT_PUBLIC_API_URL || '/api'
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
} as const;

export const CHART_COLORS = {
  PRIMARY: '#4A90E2',
  SECONDARY: '#7ED6A7',
  WARNING: '#F6D365',
  DANGER: '#E57373',
  SUCCESS: '#7ED6A7'
} as const;