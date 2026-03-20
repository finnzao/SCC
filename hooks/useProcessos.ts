// hooks/useProcessos.ts - Hook para gestão de processos

import { useState, useCallback } from 'react';
import { processoService } from '@/services/processoService';
import type {
  Processo,
  ProcessoDTO,
  ProcessoListResponse,
  ContadoresDashboard,
} from '@/types/processo';

export function useProcessos() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginacao, setPaginacao] = useState({
    paginaAtual: 0,
    totalPaginas: 0,
    totalItens: 0,
    itensPorPagina: 20,
  });

  /**
   * Listar processos com paginação e filtros
   */
  const listar = useCallback(
    async (page = 0, size = 20, termo?: string, status?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await processoService.listar(page, size, termo, status);

        if (response.success && response.data) {
          const apiData = response.data as any;
          // Handle nested data structure
          const listData: ProcessoListResponse =
            apiData?.data || apiData;

          if (listData?.processos) {
            setProcessos(listData.processos);
            setPaginacao({
              paginaAtual: listData.paginaAtual ?? 0,
              totalPaginas: listData.totalPaginas ?? 1,
              totalItens: listData.totalItens ?? listData.processos.length,
              itensPorPagina: listData.itensPorPagina ?? size,
            });
          } else if (Array.isArray(apiData)) {
            setProcessos(apiData);
            setPaginacao({
              paginaAtual: 0,
              totalPaginas: 1,
              totalItens: apiData.length,
              itensPorPagina: size,
            });
          }
        } else {
          setError(response.message || 'Erro ao listar processos');
          setProcessos([]);
        }
      } catch (err: any) {
        console.error('[useProcessos] Erro ao listar:', err);
        setError(err.message || 'Erro ao listar processos');
        setProcessos([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Buscar processos de um custodiado específico
   */
  const buscarPorCustodiado = useCallback(async (custodiadoId: number): Promise<Processo[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await processoService.buscarPorCustodiado(custodiadoId);
      if (response.success && response.data) {
        const apiData = response.data as any;
        const list: Processo[] = apiData?.data || apiData || [];
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (err: any) {
      console.error('[useProcessos] Erro ao buscar por custodiado:', err);
      setError(err.message || 'Erro ao buscar processos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar processo por ID
   */
  const buscarPorId = useCallback(async (id: number): Promise<Processo | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await processoService.buscarPorId(id);
      if (response.success && response.data) {
        const apiData = response.data as any;
        return apiData?.data || apiData || null;
      }
      return null;
    } catch (err: any) {
      console.error('[useProcessos] Erro ao buscar por ID:', err);
      setError(err.message || 'Erro ao buscar processo');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Criar novo processo
   */
  const criar = useCallback(async (dto: ProcessoDTO): Promise<{ success: boolean; message: string; data?: Processo }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await processoService.criar(dto);
      if (response.success) {
        const apiData = response.data as any;
        return {
          success: true,
          message: apiData?.message || 'Processo criado com sucesso',
          data: apiData?.data || apiData,
        };
      }
      return { success: false, message: response.message || 'Erro ao criar processo' };
    } catch (err: any) {
      console.error('[useProcessos] Erro ao criar:', err);
      return { success: false, message: err.message || 'Erro ao criar processo' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualizar processo existente
   */
  const atualizar = useCallback(async (id: number, dto: Partial<ProcessoDTO>): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await processoService.atualizar(id, dto);
      if (response.success) {
        return { success: true, message: 'Processo atualizado com sucesso' };
      }
      return { success: false, message: response.message || 'Erro ao atualizar processo' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao atualizar processo' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Encerrar processo
   */
  const encerrar = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const response = await processoService.encerrar(id);
      if (response.success) {
        return { success: true, message: 'Processo encerrado com sucesso' };
      }
      return { success: false, message: response.message || 'Erro ao encerrar processo' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao encerrar processo' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Suspender processo
   */
  const suspender = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const response = await processoService.suspender(id);
      if (response.success) {
        return { success: true, message: 'Processo suspenso com sucesso' };
      }
      return { success: false, message: response.message || 'Erro ao suspender processo' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao suspender processo' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reativar processo
   */
  const reativar = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const response = await processoService.reativar(id);
      if (response.success) {
        return { success: true, message: 'Processo reativado com sucesso' };
      }
      return { success: false, message: response.message || 'Erro ao reativar processo' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao reativar processo' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar contadores do dashboard
   */
  const buscarContadores = useCallback(async (): Promise<ContadoresDashboard | null> => {
    try {
      const response = await processoService.contadores();
      if (response.success && response.data) {
        const apiData = response.data as any;
        return apiData?.data || apiData || null;
      }
      return null;
    } catch (err: any) {
      console.error('[useProcessos] Erro ao buscar contadores:', err);
      return null;
    }
  }, []);

  /**
   * Buscar inadimplentes
   */
  const buscarInadimplentes = useCallback(async (): Promise<Processo[]> => {
    setLoading(true);
    try {
      const response = await processoService.inadimplentes();
      if (response.success && response.data) {
        const apiData = response.data as any;
        const list = apiData?.data || apiData || [];
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (err: any) {
      console.error('[useProcessos] Erro ao buscar inadimplentes:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar processos com comparecimento para hoje
   */
  const buscarHoje = useCallback(async (): Promise<Processo[]> => {
    setLoading(true);
    try {
      const response = await processoService.hoje();
      if (response.success && response.data) {
        const apiData = response.data as any;
        const list = apiData?.data || apiData || [];
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (err: any) {
      console.error('[useProcessos] Erro ao buscar hoje:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    processos,
    loading,
    error,
    paginacao,
    // CRUD
    listar,
    buscarPorId,
    buscarPorCustodiado,
    criar,
    atualizar,
    // Ações de gestão (F10)
    encerrar,
    suspender,
    reativar,
    // Consultas
    buscarContadores,
    buscarInadimplentes,
    buscarHoje,
  };
}
