import * as XLSX from 'xlsx';
import type { ComparecimentoResponse } from '@/types/api';

/**
 * Informações de filtro para exportação de histórico
 */
export interface HistoricoExportFilterInfo {
  filtro?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}

/**
 * Opções para exportação de histórico
 */
export interface HistoricoExportOptions {
  filename?: string;
  sheetName?: string;
  includeFilters?: boolean;
  filterInfo?: HistoricoExportFilterInfo;
}

/**
 * Utilitários de formatação de data
 */
const dateUtils = {
  formatToBR: (date?: string | Date): string => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  },

  formatTimeToBR: (time?: string): string => {
    if (!time) return '';
    try {
      // Se já estiver no formato HH:MM:SS, retorna direto
      if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
      
      // Se for timestamp completo, extrai apenas a hora
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('pt-BR');
      }
      
      return time;
    } catch {
      return time || '';
    }
  }
};

/**
 * Formata tipo de validação para exibição
 */
function formatTipoValidacao(tipo: string): string {
  if (!tipo) return '';
  
  const tipoNormalizado = tipo.toLowerCase();
  const formatacao: Record<string, string> = {
    'presencial': 'Presencial',
    'online': 'Online',
    'cadastro_inicial': 'Cadastro Inicial'
  };
  
  return formatacao[tipoNormalizado] || tipo;
}

/**
 * Converte dados de histórico para formato de planilha
 */
export function convertHistoricoToSheetData(dados: ComparecimentoResponse[]) {
  return dados.map((item, index) => ({
    '#': index + 1,
    'Pessoa Monitorada': item.custodiadoNome || 'Não informado',
    'Data': dateUtils.formatToBR(item.dataComparecimento),
    'Hora': dateUtils.formatTimeToBR(item.horaComparecimento),
    'Tipo': formatTipoValidacao(item.tipoValidacao),
    'Validado Por': item.validadoPor || '',
    'Houve Mudança de Endereço': item.mudancaEndereco ? 'Sim' : 'Não'
  }));
}

/**
 * Cria informações de filtros aplicados
 */
export function createHistoricoFilterInfo(filterInfo?: HistoricoExportFilterInfo): [string, string][] {
  if (!filterInfo) return [];

  const info: [string, string][] = [];

  if (filterInfo.filtro) {
    info.push(['Busca:', filterInfo.filtro]);
  }

  if (filterInfo.status && filterInfo.status !== 'todos') {
    info.push(['Tipo de Validação:', formatTipoValidacao(filterInfo.status)]);
  }

  if (filterInfo.dataInicio && filterInfo.dataFim) {
    info.push([
      'Período:', 
      `${dateUtils.formatToBR(filterInfo.dataInicio)} até ${dateUtils.formatToBR(filterInfo.dataFim)}`
    ]);
  }

  return info;
}

/**
 * Aplica formatação à planilha de histórico
 */
export function formatHistoricoWorksheet(worksheet: XLSX.WorkSheet, dataLength: number) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Definir larguras das colunas
  const colWidths = [
    { wch: 5 },   // #
    { wch: 35 },  // Pessoa Monitorada
    { wch: 12 },  // Data
    { wch: 10 },  // Hora
    { wch: 18 },  // Tipo
    { wch: 30 },  // Validado Por
    { wch: 22 }   // Houve Mudança de Endereço
  ];

  worksheet['!cols'] = colWidths;

  // Aplicar estilos ao cabeçalho
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
    if (!worksheet[cellAddress]) continue;

    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4A90E2" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // Aplicar formatação condicional para tipos de validação
  for (let R = 1; R <= dataLength; R++) {
    const tipoCell = XLSX.utils.encode_cell({ c: 4, r: R }); // Tipo (coluna 4)
    
    if (worksheet[tipoCell]) {
      const tipo = String(worksheet[tipoCell].v || '').toLowerCase();
      
      if (tipo === 'presencial') {
        worksheet[tipoCell].s = {
          fill: { fgColor: { rgb: "C8E6C9" } },
          font: { color: { rgb: "2E7D32" }, bold: true },
          alignment: { horizontal: "center" }
        };
      } else if (tipo === 'online') {
        worksheet[tipoCell].s = {
          fill: { fgColor: { rgb: "BBDEFB" } },
          font: { color: { rgb: "1565C0" }, bold: true },
          alignment: { horizontal: "center" }
        };
      } else if (tipo === 'cadastro inicial') {
        worksheet[tipoCell].s = {
          fill: { fgColor: { rgb: "E1BEE7" } },
          font: { color: { rgb: "6A1B9A" }, bold: true },
          alignment: { horizontal: "center" }
        };
      }
    }
  }

  // Centralizar colunas de data, hora e sim/não
  for (let R = 1; R <= dataLength; R++) {
    // #
    const numeroCell = XLSX.utils.encode_cell({ c: 0, r: R });
    if (worksheet[numeroCell]) {
      worksheet[numeroCell].s = { alignment: { horizontal: "center" } };
    }
    
    // Data
    const dataCell = XLSX.utils.encode_cell({ c: 2, r: R });
    if (worksheet[dataCell]) {
      worksheet[dataCell].s = { alignment: { horizontal: "center" } };
    }
    
    // Hora
    const horaCell = XLSX.utils.encode_cell({ c: 3, r: R });
    if (worksheet[horaCell]) {
      worksheet[horaCell].s = { alignment: { horizontal: "center" } };
    }
    
    // Houve Mudança de Endereço
    const mudancaCell = XLSX.utils.encode_cell({ c: 6, r: R });
    if (worksheet[mudancaCell]) {
      worksheet[mudancaCell].s = { alignment: { horizontal: "center" } };
    }
  }
}

/**
 * Função principal para exportar histórico de comparecimentos para Excel
 */
export function exportHistoricoToExcel(
  dados: ComparecimentoResponse[], 
  options: HistoricoExportOptions = {}
) {
  const {
    filename = `historico_comparecimentos_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Histórico de Comparecimentos',
    includeFilters = false,
    filterInfo
  } = options;

  try {
    if (!dados || dados.length === 0) {
      return {
        success: false,
        message: 'Nenhum dado disponível para exportação',
        count: 0
      };
    }


    const sheetData = convertHistoricoToSheetData(dados);

    const workbook = XLSX.utils.book_new();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalData: any[] = [];

    if (includeFilters && filterInfo) {
      const filterInfoData = createHistoricoFilterInfo(filterInfo);
      
      const headerRows = [
        ['RELATÓRIO DE HISTÓRICO DE COMPARECIMENTOS'],
        ['Gerado em:', new Date().toLocaleString('pt-BR')],
        ['Total de Registros:', dados.length],
        ['']
      ];

      if (filterInfoData.length > 0) {
        headerRows.push(['FILTROS APLICADOS:']);
        headerRows.push(...filterInfoData);
        headerRows.push(['']);
      }

      headerRows.push(['DADOS:']);

      finalData = [
        ...headerRows,
        Object.keys(sheetData[0] || {}), // Cabeçalhos das colunas
        ...sheetData.map(row => Object.values(row))
      ];
    } else {
      finalData = [
        Object.keys(sheetData[0] || {}), // Cabeçalhos das colunas
        ...sheetData.map(row => Object.values(row))
      ];
    }

    // Criar worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    // Aplicar formatação
    formatHistoricoWorksheet(worksheet, sheetData.length);

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Fazer download
    XLSX.writeFile(workbook, filename);

    return {
      success: true,
      message: `Arquivo ${filename} exportado com sucesso!`,
      count: dados.length
    };

  } catch (error) {
    console.error('Erro ao exportar histórico para Excel:', error);
    return {
      success: false,
      message: 'Erro ao gerar arquivo Excel. Tente novamente.',
      error
    };
  }
}

/**
 * Função para exportar dados filtrados de histórico
 */
export function exportFilteredHistorico(
  dadosOriginais: ComparecimentoResponse[],
  dadosFiltrados: ComparecimentoResponse[],
  filterInfo?: HistoricoExportFilterInfo
) {
  const hasFilters = filterInfo && Object.values(filterInfo).some(
    value => value && value !== 'todos' && value !== ''
  );

  return exportHistoricoToExcel(dadosFiltrados, {
    filename: hasFilters
      ? `historico_filtrado_${new Date().toISOString().split('T')[0]}.xlsx`
      : `historico_completo_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName: 'Histórico',
    includeFilters: hasFilters,
    filterInfo: hasFilters ? filterInfo : undefined
  });
}

/**
 * Calcular estatísticas do histórico
 */
export function calculateHistoricoStatistics(dados: ComparecimentoResponse[]) {
  const porTipo = dados.reduce((acc, item) => {
    const tipo = formatTipoValidacao(item.tipoValidacao);
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const comMudancaEndereco = dados.filter(d => d.mudancaEndereco).length;
  const comAnexos = dados.filter(d => d.anexos).length;

  return {
    total: dados.length,
    porTipo,
    comMudancaEndereco,
    comAnexos
  };
}