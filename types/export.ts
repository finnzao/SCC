import { PessoaMonitoradaData } from './api';

/**
 * Informações de filtro aplicados na exportação
 */
export interface ExportFilterInfo {
  /** Termo de busca/filtro geral */
  filtro?: string;
  
  /** Status do comparecimento: 'em conformidade' | 'inadimplente' | 'todos' */
  status?: string;
  
  /** Urgência: 'hoje' | 'atrasados' | 'proximos' | 'todos' */
  urgencia?: string;
  
  /** Data de início do período (ISO format) */
  dataInicio?: string;
  
  /** Data de fim do período (ISO format) */
  dataFim?: string;
}

/**
 * Opções para exportação de dados
 */
export interface ExportOptions {
  /** Nome do arquivo a ser gerado */
  filename?: string;
  
  /** Nome da planilha/aba */
  sheetName?: string;
  
  /** Se deve incluir informações de filtros no relatório */
  includeFilters?: boolean;
  
  /** Informações dos filtros aplicados */
  filterInfo?: ExportFilterInfo;
}

/**
 * Dados de exportação com campos calculados
 */
export type ExportData = PessoaMonitoradaData & {
  /** Número de dias em atraso (se aplicável) */
  diasAtraso?: number;
  
  /** Status de urgência calculado */
  statusUrgencia?: string;
};

/**
 * Resultado da operação de exportação
 */
export interface ExportResult {
  /** Se a exportação foi bem-sucedida */
  success: boolean;
  
  /** Mensagem de sucesso ou erro */
  message: string;
  
  /** Quantidade de registros exportados */
  count?: number;
  
  /** Mensagem de erro detalhada (se houver) */
  error?: string;
}

/**
 * Estatísticas dos dados exportados
 */
export interface ExportStatistics {
  /** Total de registros */
  totalRegistros: number;
  
  /** Quantidade em conformidade */
  emConformidade: number;
  
  /** Quantidade inadimplentes */
  inadimplentes: number;
  
  /** Comparecimentos marcados para hoje */
  comparecimentosHoje: number;
  
  /** Comparecimentos atrasados */
  atrasados: number;
  
  /** Comparecimentos nos próximos 7 dias */
  proximosPrazos: number;
}

/**
 * Tipos de urgência para filtros
 */
export type UrgenciaType = 'hoje' | 'atrasados' | 'proximos' | 'todos';

/**
 * Tipos de status para filtros
 */
export type StatusType = 'em conformidade' | 'inadimplente' | 'todos';

/**
 * Configuração de estilo para células Excel
 */
export interface CellStyle {
  font?: {
    bold?: boolean;
    size?: number;
    color?: { rgb: string };
    name?: string;
  };
  fill?: {
    fgColor: { rgb: string };
  };
  color?: {
    rgb: string;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
}

/**
 * Configuração de coluna para Excel
 */
export interface ColumnConfig {
  /** Chave da coluna */
  key: string;
  
  /** Título do cabeçalho */
  header: string;
  
  /** Largura da coluna em caracteres */
  width?: number;
  
  /** Estilo da coluna */
  style?: CellStyle;
}

/**
 * Metadados do arquivo Excel
 */
export interface ExcelMetadata {
  /** Criador do arquivo */
  creator?: string;
  
  /** Última modificação por */
  lastModifiedBy?: string;
  
  /** Data de criação */
  created?: Date;
  
  /** Data de modificação */
  modified?: Date;
  
  /** Título do arquivo */
  title?: string;
  
  /** Assunto */
  subject?: string;
  
  /** Descrição */
  description?: string;
  
  /** Palavras-chave */
  keywords?: string;
  
  /** Categoria */
  category?: string;
  
  /** Empresa/Organização */
  company?: string;
}

/**
 * Tipo de exportação
 */
export type ExportType = 'all' | 'filtered';

/**
 * Formato de exportação
 */
export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

/**
 * Validação de filtro
 */
export interface FilterValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}