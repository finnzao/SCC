/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useCallback } from 'react';
import { PessoaMonitoradaData } from '@/types/api';
import { exportFilteredData } from '@/lib/utils/excelExport';
import type { ExportFilterInfo } from '@/lib/utils/excelExport';

/**
 * Resultado da exportação
 */
export interface ExportResult {
  success: boolean;
  message: string;
  count?: number;
  error?: string;  // Changed from unknown to string
}

/**
 * Opções do hook useExport
 */
interface UseExportOptions {
  onSuccess?: (result: ExportResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook para gerenciar exportação de dados para Excel
 */
export function useExport(options: UseExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);

  /**
   * Exportar dados com opções personalizadas
   */
  const exportData = useCallback(async (
    allData: PessoaMonitoradaData[],
    filteredData: PessoaMonitoradaData[],
    filterInfo?: ExportFilterInfo,
    exportType: 'all' | 'filtered' = 'filtered'
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setLastExportResult(null);

    try {
      const dataToExport = exportType === 'filtered' ? filteredData : allData;
      
      const result = exportFilteredData(
        allData,
        dataToExport,
        exportType === 'filtered' ? filterInfo : undefined
      );

      // Converter o resultado para o formato correto
      const exportResult: ExportResult = {
        success: result.success,
        message: result.message,
        count: result.count,
        error: result.error ? String(result.error) : undefined
      };

      setLastExportResult(exportResult);

      if (exportResult.success) {
        options.onSuccess?.(exportResult);
      } else {
        options.onError?.(exportResult.message);
      }

      return exportResult;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro inesperado durante a exportação';

      const errorResult: ExportResult = {
        success: false,
        message: errorMessage,
        error: errorMessage
      };

      setLastExportResult(errorResult);
      options.onError?.(errorMessage);

      return errorResult;
    } finally {
      setIsExporting(false);
    }
  }, [options]);

  /**
   * Exportar todos os dados
   */
  const exportAll = useCallback(async (
    allData: PessoaMonitoradaData[]
  ): Promise<ExportResult> => {
    return exportData(allData, allData, undefined, 'all');
  }, [exportData]);

  /**
   * Exportar dados filtrados
   */
  const exportFiltered = useCallback(async (
    allData: PessoaMonitoradaData[],
    filteredData: PessoaMonitoradaData[],
    filterInfo?: ExportFilterInfo
  ): Promise<ExportResult> => {
    return exportData(allData, filteredData, filterInfo, 'filtered');
  }, [exportData]);

  /**
   * Resetar estado da exportação
   */
  const reset = useCallback(() => {
    setLastExportResult(null);
  }, []);

  return {
    isExporting,
    lastExportResult,
    exportData,
    exportAll,
    exportFiltered,
    reset
  };
}

/**
 * Hook simplificado para exportação rápida
 */
export function useQuickExport() {
  const [isExporting, setIsExporting] = useState(false);

  const quickExport = useCallback(async (
    data: PessoaMonitoradaData[],
    filename?: string
  ): Promise<boolean> => {
    setIsExporting(true);
    
    try {
      const result = exportFilteredData(data, data, undefined);
      return result.success;
    } catch (error) {
      console.error('Erro ao exportar:', error);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    quickExport
  };
}

/**
 * Hook com toast notifications
 */
export function useExportWithToast(showToast?: (message: string, type: 'success' | 'error') => void) {
  return useExport({
    onSuccess: (result) => {
      showToast?.(
        `${result.count} registro(s) exportado(s) com sucesso!`,
        'success'
      );
    },
    onError: (error) => {
      showToast?.(error, 'error');
    }
  });
}

export default useExport;