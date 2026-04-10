/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '@/lib/http/client';
import type { CustodiadoData } from '@/types/api';
import type { CustodiadosPaginadosParams, PaginacaoMeta } from '@/types/pagination';

interface UseCustodiadosPaginadosOptions {
  size?: number;
  autoLoad?: boolean;
  filtrosIniciais?: {
    nome?: string;
    cpf?: string;
    status?: string;
    ordenarPor?: CustodiadosPaginadosParams['ordenarPor'];
    direcao?: CustodiadosPaginadosParams['direcao'];
  };
}

interface UseCustodiadosPaginadosReturn {
  custodiados: CustodiadoData[];
  paginacao: PaginacaoMeta;
  loading: boolean;
  error: string | null;
  filtrosAtivos: Partial<CustodiadosPaginadosParams>;
  irParaPagina: (page: number) => void;
  proximaPagina: () => void;
  paginaAnterior: () => void;
  aplicarFiltros: (filtros: Partial<CustodiadosPaginadosParams>) => void;
  limparFiltros: () => void;
  ordenarPor: (campo: CustodiadosPaginadosParams['ordenarPor'], direcao?: 'asc' | 'desc') => void;
  refetch: () => void;
}

const PAGINACAO_INICIAL: PaginacaoMeta = {
  paginaAtual: 0,
  totalPaginas: 0,
  totalItens: 0,
  itensPorPagina: 20,
  temProxima: false,
  temAnterior: false,
};

export function useCustodiadosPaginados(
  options: UseCustodiadosPaginadosOptions = {}
): UseCustodiadosPaginadosReturn {
  const { size = 20, autoLoad = true, filtrosIniciais = {} } = options;

  const [custodiados, setCustodiados] = useState<CustodiadoData[]>([]);
  const [paginacao, setPaginacao] = useState<PaginacaoMeta>({
    ...PAGINACAO_INICIAL,
    itensPorPagina: size,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [params, setParams] = useState<CustodiadosPaginadosParams>({
    page: 0,
    size,
    nome: filtrosIniciais.nome,
    cpf: filtrosIniciais.cpf,
    status: filtrosIniciais.status,
    ordenarPor: filtrosIniciais.ordenarPor || 'nome',
    direcao: filtrosIniciais.direcao || 'asc',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const buscar = useCallback(async (parametros: CustodiadosPaginadosParams) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string | number> = {
        page: parametros.page,
        size: parametros.size,
      };
      if (parametros.nome) queryParams.nome = parametros.nome;
      if (parametros.cpf) queryParams.cpf = parametros.cpf;
      if (parametros.status) queryParams.status = parametros.status;
      if (parametros.ordenarPor) queryParams.ordenarPor = parametros.ordenarPor;
      if (parametros.direcao) queryParams.direcao = parametros.direcao;

      const response = await httpClient.get<any>('/custodiados', queryParams);

      if (abortControllerRef.current?.signal.aborted) return;

      if (response.success && response.data) {
        const dados = response.data;

        let lista: CustodiadoData[] = [];
        if (Array.isArray(dados)) {
          lista = dados;
        } else if (Array.isArray(dados.data)) {
          lista = dados.data;
        }

        setCustodiados(lista);

        if (dados.totalPaginas !== undefined) {
          setPaginacao({
            paginaAtual: dados.paginaAtual ?? parametros.page,
            totalPaginas: dados.totalPaginas ?? 1,
            totalItens: dados.totalItens ?? 0,
            itensPorPagina: dados.itensPorPagina ?? parametros.size,
            temProxima: dados.temProxima ?? false,
            temAnterior: dados.temAnterior ?? false,
          });
        } else {
          setPaginacao({
            paginaAtual: 0,
            totalPaginas: 1,
            totalItens: lista.length,
            itensPorPagina: lista.length,
            temProxima: false,
            temAnterior: false,
          });
        }
      } else {
        setError(response.message || 'Erro ao carregar custodiados');
        setCustodiados([]);
        setPaginacao(PAGINACAO_INICIAL);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[useCustodiadosPaginados] Erro:', err);
      setError('Erro ao conectar com o servidor');
      setCustodiados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) buscar(params);
    return () => { abortControllerRef.current?.abort(); };
  }, [params, buscar, autoLoad]);

  useEffect(() => {
    const handler = () => {
      buscar(paramsRef.current);
    };

    window.addEventListener('comparecimento-registrado', handler);
    window.addEventListener('custodiado-atualizado', handler);

    return () => {
      window.removeEventListener('comparecimento-registrado', handler);
      window.removeEventListener('custodiado-atualizado', handler);
    };
  }, [buscar]);

  useEffect(() => {
    const needsRefetch = typeof window !== 'undefined'
      ? sessionStorage.getItem('needsRefetch')
      : null;

    if (needsRefetch === 'true') {
      sessionStorage.removeItem('needsRefetch');
      sessionStorage.removeItem('lastUpdate');
      buscar(paramsRef.current);
    }
  }, [buscar]);

  useEffect(() => {
    const handleFocus = () => {
      const needsRefetch = sessionStorage.getItem('needsRefetch');
      if (needsRefetch === 'true') {
        sessionStorage.removeItem('needsRefetch');
        sessionStorage.removeItem('lastUpdate');
        buscar(paramsRef.current);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [buscar]);

  const irParaPagina = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  const proximaPagina = useCallback(() => {
    if (paginacao.temProxima) {
      setParams(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [paginacao.temProxima]);

  const paginaAnterior = useCallback(() => {
    if (paginacao.temAnterior) {
      setParams(prev => ({ ...prev, page: Math.max(0, prev.page - 1) }));
    }
  }, [paginacao.temAnterior]);

  const aplicarFiltros = useCallback((filtros: Partial<CustodiadosPaginadosParams>) => {
    setParams(prev => ({ ...prev, ...filtros, page: 0 }));
  }, []);

  const limparFiltros = useCallback(() => {
    setParams({ page: 0, size, ordenarPor: 'nome', direcao: 'asc' });
  }, [size]);

  const ordenarPorFn = useCallback((
    campo: CustodiadosPaginadosParams['ordenarPor'],
    direcao?: 'asc' | 'desc'
  ) => {
    setParams(prev => ({
      ...prev,
      ordenarPor: campo,
      direcao: direcao || (prev.ordenarPor === campo && prev.direcao === 'asc' ? 'desc' : 'asc'),
      page: 0,
    }));
  }, []);

  const refetch = useCallback(() => {
    buscar(paramsRef.current);
  }, [buscar]);

  return {
    custodiados,
    paginacao,
    loading,
    error,
    filtrosAtivos: params,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    aplicarFiltros,
    limparFiltros,
    ordenarPor: ordenarPorFn,
    refetch,
  };
}