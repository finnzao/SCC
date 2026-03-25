/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useApi.ts - Hooks para interação com a API

import { useState, useEffect, useCallback } from 'react';
import {
  custodiadosService,
  comparecimentosService,
  usuariosService,
  setupService,
  statusService,
  testService
} from '@/lib/api/services';
import {
  CustodiadoResponse,
  ComparecimentoResponse,
  UsuarioResponse,
  CustodiadoDTO,
  ComparecimentoDTO,
  UsuarioDTO,
  PeriodoParams,
  BuscarParams,
  EstatisticasComparecimentoResponse,
  SetupStatusResponse,
  HealthResponse,
  AppInfoResponse,
  ResumoSistemaResponse,
  ListarCustodiadosResponse,
  CustodiadoData,
} from '@/types/api';
import { StatusComparecimento } from '@/types/api';
// Hook para custodiados
export function useCustodiados() {
  const [custodiados, setCustodiados] = useState<CustodiadoData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustodiados = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useCustodiados] Iniciando busca de custodiados...', { forceRefresh });

      const response: ListarCustodiadosResponse = await custodiadosService.listar();
      console.log('[useCustodiados] Resposta recebida:', response);

      if (response.success && Array.isArray(response.data)) {
        console.log('[useCustodiados] Custodiados carregados:', response.data.length);
        setCustodiados(response.data);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastDataFetch', Date.now().toString());
        }
      } else {
        setError(response.message || 'Erro ao carregar dados');
        setCustodiados([]);
      }
    } catch (err) {
      console.error('[useCustodiados] Erro na requisição:', err);
      setError('Erro ao conectar com o servidor');
      setCustodiados([]);
    } finally {
      setLoading(false);
    }
  };

  // Criar Custodiado
  const criarCustodiado = useCallback(async (data: CustodiadoDTO) => {
    try {
      setLoading(true);
      console.log('[useCustodiados] Criando Custodiado:', data);

      const result = await custodiadosService.criar(data);

      if (result.success) {
        // Atualizar lista automaticamente após criação
        await fetchCustodiados();
        return {
          success: true,
          message: result.message || 'Custodiado criado com sucesso',
          data: result.data
        };
      }

      return {
        success: false,
        message: result.message || 'Erro ao criar Custodiado'
      };
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao criar Custodiado:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do sistema'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar Custodiado
  const atualizarCustodiado = useCallback(async (id: number, data: Partial<CustodiadoDTO>) => {
    try {
      setLoading(true);
      console.log(`[useCustodiados] Atualizando Custodiado ID: ${id}`, data);

      const result = await custodiadosService.atualizar(id, data);

      if (result.success) {
        // Atualizar lista automaticamente após atualização
        await fetchCustodiados();
        return {
          success: true,
          message: result.message || 'Custodiado atualizado com sucesso',
          data: result.data
        };
      }

      return {
        success: false,
        message: result.message || 'Erro ao atualizar Custodiado'
      };
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao atualizar Custodiado:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do sistema'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir Custodiado
  const excluirCustodiado = useCallback(async (id: number) => {
    try {
      setLoading(true);

      const result = await custodiadosService.excluir(id);

      if (result.success) {
        // Atualizar lista automaticamente após exclusão
        await fetchCustodiados();
        return {
          success: true,
          message: result.message || 'Custodiado excluído com sucesso'
        };
      }

      return {
        success: false,
        message: result.message || 'Erro ao excluir Custodiado'
      };
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao excluir Custodiado:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do sistema'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar Custodiado por ID
  const buscarPorId = useCallback(async (id: number) => {
    try {
      console.log(`[useCustodiados] Buscando Custodiado ID: ${id}`);
      const result = await custodiadosService.buscarPorId(id);
      return result;
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao buscar Custodiado por ID:', error);
      return null;
    }
  }, []);

  // Buscar Custodiado por processo
  const buscarPorProcesso = useCallback(async (processo: string) => {
    try {
      console.log(`[useCustodiados] Buscando Custodiado por processo: ${processo}`);
      const result = await custodiadosService.buscarPorProcesso(processo);
      return result;
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao buscar Custodiado por processo:', error);
      return null;
    }
  }, []);

  // Buscar inadimplentes
  const buscarInadimplentes = useCallback(async () => {
    try {
      console.log('[useCustodiados] Buscando inadimplentes');
      const result = await custodiadosService.buscarInadimplentes();
      return result;
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao buscar inadimplentes:', error);
      return [];
    }
  }, []);

  // Buscar por status
  const buscarPorStatus = useCallback(async (status: StatusComparecimento) => {
    try {
      console.log(`[useCustodiados] Buscando por status: ${status}`);
      const result = await custodiadosService.buscarPorStatus(status);
      return result;
    } catch (error: any) {
      console.error('[useCustodiados] Erro ao buscar por status:', error);
      return [];
    }
  }, []);

  // Busca geral com parâmetros
  const buscar = useCallback(async (params: BuscarParams) => {
    try {
      console.log('[useCustodiados] Fazendo busca com parâmetros:', params);
      const result = await custodiadosService.buscar(params);
      return result;
    } catch (error: any) {
      console.error('[useCustodiados] Erro na busca:', error);
      return [];
    }
  }, []);

  // Forçar atualização da lista
  const refetch = useCallback((forceRefresh = true) => {
    return fetchCustodiados(forceRefresh);
  }, []);

  useEffect(() => {
    fetchCustodiados();
  }, []);

  return {
    custodiados,
    loading,
    error,
    // Operações CRUD
    criarCustodiado,
    atualizarCustodiado,
    excluirCustodiado,
    // Buscas
    buscarPorId,
    buscarPorProcesso,
    buscarInadimplentes,
    buscarPorStatus,
    buscar,
    // Utilitários
    refetch
  };
}

// Hook para Comparecimentos
export function useComparecimentos() {
  const [comparecimentos, setComparecimentos] = useState<ComparecimentoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrarComparecimento = useCallback(async (data: ComparecimentoDTO) => {
    try {
      setLoading(true);
      const result = await comparecimentosService.registrar(data);
      if (result.success) {
        return { success: true, message: 'Comparecimento registrado com sucesso', data: result.data };
      }
      return { success: false, message: result.message || 'Erro ao registrar comparecimento' };
    } catch (error) {
      console.error('Erro ao registrar comparecimento:', error);
      return { success: false, message: 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarPorCustodiado = useCallback(async (custodiadoId: number) => {
    try {
      setLoading(true);
      const data = await comparecimentosService.buscarPorCustodiado(custodiadoId);
      setComparecimentos(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar comparecimentos:', error);
      setError('Erro ao buscar comparecimentos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarPorPeriodo = useCallback(async (params: PeriodoParams) => {
    try {
      setLoading(true);
      const data = await comparecimentosService.buscarPorPeriodo(params);
      setComparecimentos(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar por período:', error);
      setError('Erro ao buscar comparecimentos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const comparecimentosHoje = useCallback(async () => {
    try {
      return await comparecimentosService.comparecimentosHoje();
    } catch (error) {
      console.error('Erro ao buscar comparecimentos de hoje:', error);
      return [];
    }
  }, []);

  return {
    comparecimentos,
    loading,
    error,
    registrarComparecimento,
    buscarPorCustodiado,
    buscarPorPeriodo,
    comparecimentosHoje
  };
}

// Hook para Usuários
export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usuariosService.listar();
      setUsuarios(data);
    } catch (err) {
      setError('Erro ao carregar usuários');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const criarUsuario = useCallback(async (data: UsuarioDTO) => {
    try {
      const result = await usuariosService.criar(data);
      if (result.success) {
        await carregarUsuarios();
        return { success: true, message: 'Usuário criado com sucesso' };
      }
      return { success: false, message: result.message || 'Erro ao criar usuário' };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { success: false, message: 'Erro interno do sistema' };
    }
  }, [carregarUsuarios]);

  const atualizarUsuario = useCallback(async (id: number, data: Partial<UsuarioDTO>) => {
    try {
      const result = await usuariosService.atualizar(id, data);
      if (result.success) {
        await carregarUsuarios();
        return { success: true, message: 'Usuário atualizado com sucesso' };
      }
      return { success: false, message: result.message || 'Erro ao atualizar usuário' };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return { success: false, message: 'Erro interno do sistema' };
    }
  }, [carregarUsuarios]);

  return {
    usuarios,
    loading,
    error,
    criarUsuario,
    atualizarUsuario,
    refetch: carregarUsuarios
  };
}

// Hook para Estatísticas
export function useEstatisticas() {
  const [stats, setStats] = useState<EstatisticasComparecimentoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarEstatisticas = useCallback(async (params?: PeriodoParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await comparecimentosService.obterEstatisticas(params);
      setStats(data);
      return data;
    } catch (err) {
      setError('Erro ao carregar estatísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarEstatisticas();
  }, [carregarEstatisticas]);

  return {
    stats,
    loading,
    error,
    refetch: carregarEstatisticas
  };
}

// Hook para Resumo do Sistema
export function useResumoSistema() {
  const [resumo, setResumo] = useState<ResumoSistemaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarResumo = useCallback(async () => {


    try {
      setError(null);
      const data = await comparecimentosService.obterResumoSistema();
      setResumo(data);
      console.log('[useResumoSistema] Resumo carregado:', data);
    } catch (err) {
      setError('Erro ao carregar resumo do sistema');
      console.error('[useResumoSistema] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  return {
    resumo,
    loading,
    error,
    refetch: carregarResumo
  };
}

// Hook para Status
export function useStatus() {
  const verificarInadimplentes = useCallback(async () => {
    try {
      return await statusService.verificarInadimplentes();
    } catch (error) {
      console.error('Erro ao verificar inadimplentes:', error);
      return { success: false, message: 'Erro ao verificar inadimplentes' };
    }
  }, []);

  const obterEstatisticas = useCallback(async () => {
    try {
      return await statusService.obterEstatisticas();
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }, []);

  return {
    verificarInadimplentes,
    obterEstatisticas
  };
}

// Hook para Setup
export function useSetup() {
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const verificarStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await setupService.getStatus();
      setSetupStatus(status);
      return status;
    } catch (error) {
      console.error('Erro ao verificar status do setup:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verificarStatus();
  }, [verificarStatus]);

  const criarAdmin = useCallback(async (data: any) => {
    try {
      const result = await setupService.createAdmin(data);
      if (result.success) {
        await verificarStatus();
      }
      return result;
    } catch (error) {
      console.error('Erro ao criar admin:', error);
      return { success: false, message: 'Erro interno', timestamp: new Date().toISOString() };
    }
  }, [verificarStatus]);

  return {
    setupStatus,
    loading,
    criarAdmin,
    verificarStatus
  };
}

// Hook para Health Check
export function useHealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const verificarHealth = useCallback(async () => {
    try {
      setLoading(true);
      const [healthData, infoData] = await Promise.all([
        testService.health(),
        testService.info()
      ]);
      setHealth(healthData);
      setAppInfo(infoData);
      return { health: healthData, info: infoData };
    } catch (error) {
      console.error('Erro ao verificar health:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    health,
    appInfo,
    loading,
    verificarHealth
  };
}

// Hook para Busca Geral
export function useBusca() {
  const [resultados, setResultados] = useState<CustodiadoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(async (params: BuscarParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await custodiadosService.buscar(params);
      setResultados(data);
      return data;
    } catch (err) {
      setError('Erro ao realizar busca');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const limparResultados = useCallback(() => {
    setResultados([]);
    setError(null);
  }, []);

  return {
    resultados,
    loading,
    error,
    buscar,
    limparResultados
  };
}