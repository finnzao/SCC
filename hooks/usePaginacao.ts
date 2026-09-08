'use client';

// Nucleo unico de paginacao server-side (M4 do review de qualidade):
// abort por requisicao, montagem de query, extracao de lista/meta e acoes.
// Cada tela vira um wrapper fino de configuracao — correcoes valem para todas.

import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '@/lib/http/client';
import type { PaginacaoMeta } from '@/types/pagination';

export interface ParamsPaginados {
  page: number;
  size: number;
}

interface UsePaginacaoConfig<TParams extends ParamsPaginados, TItem> {
  endpoint: string;
  paramsIniciais: TParams;
  /** Extrai a lista bruta do response.data (formatos variam por endpoint). */
  extrairLista: (dados: Record<string, unknown>) => unknown[];
  /** Transforma cada item bruto (default: identidade). */
  mapearItem?: (bruto: unknown) => TItem;
  mensagemErro: string;
  autoLoad?: boolean;
}

export interface UsePaginacaoReturn<TParams extends ParamsPaginados, TItem> {
  itens: TItem[];
  paginacao: PaginacaoMeta;
  loading: boolean;
  error: string | null;
  filtrosAtivos: Partial<TParams>;
  irParaPagina: (page: number) => void;
  proximaPagina: () => void;
  paginaAnterior: () => void;
  aplicarFiltros: (filtros: Partial<TParams>) => void;
  /** Volta aos params dados (ou aos iniciais com page 0). */
  limparFiltros: (paramsLimpos?: TParams) => void;
  atualizarParams: (fn: (prev: TParams) => TParams) => void;
  refetch: () => void;
}

const paginacaoInicial = (size: number): PaginacaoMeta => ({
  paginaAtual: 0,
  totalPaginas: 0,
  totalItens: 0,
  itensPorPagina: size,
  temProxima: false,
  temAnterior: false,
});

export function usePaginacao<TParams extends ParamsPaginados, TItem>(
  config: UsePaginacaoConfig<TParams, TItem>
): UsePaginacaoReturn<TParams, TItem> {
  const { endpoint, paramsIniciais, extrairLista, mapearItem, mensagemErro, autoLoad = true } = config;

  const [itens, setItens] = useState<TItem[]>([]);
  const [paginacao, setPaginacao] = useState<PaginacaoMeta>(paginacaoInicial(paramsIniciais.size));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<TParams>(paramsIniciais);

  const abortRef = useRef<AbortController | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const configRef = useRef({ endpoint, extrairLista, mapearItem, mensagemErro });
  configRef.current = { endpoint, extrairLista, mapearItem, mensagemErro };

  const buscar = useCallback(async (parametros: TParams) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // envia apenas os filtros com valor
      const queryParams: Record<string, string | number> = {};
      for (const [chave, valor] of Object.entries(parametros)) {
        if (valor !== undefined && valor !== null && valor !== '') {
          queryParams[chave] = valor as string | number;
        }
      }

      const cfg = configRef.current;
      const response = await httpClient.get<Record<string, unknown>>(cfg.endpoint, queryParams);

      if (abortRef.current?.signal.aborted) return;

      if (!response.success || !response.data) {
        throw new Error(response.message || cfg.mensagemErro);
      }

      const dados = response.data as Record<string, unknown>;
      const brutos = cfg.extrairLista(dados);
      const lista = (cfg.mapearItem ? brutos.map(cfg.mapearItem) : brutos) as TItem[];
      setItens(lista);

      // metadados podem vir no topo ou aninhados em data
      const meta = ((dados.totalPaginas !== undefined ? dados : dados.data) ?? {}) as Record<string, number | boolean | undefined>;
      if (meta.totalPaginas !== undefined) {
        setPaginacao({
          paginaAtual: (meta.paginaAtual as number) ?? parametros.page,
          totalPaginas: (meta.totalPaginas as number) ?? 1,
          totalItens: (meta.totalItens as number) ?? 0,
          itensPorPagina: (meta.itensPorPagina as number) ?? parametros.size,
          temProxima: (meta.temProxima as boolean) ?? false,
          temAnterior: (meta.temAnterior as boolean) ?? false,
        });
      } else {
        setPaginacao({
          paginaAtual: parametros.page,
          totalPaginas: 1,
          totalItens: lista.length,
          itensPorPagina: parametros.size,
          temProxima: false,
          temAnterior: parametros.page > 0,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error(`[usePaginacao:${configRef.current.endpoint}]`, err);
      setError(err instanceof Error ? err.message : configRef.current.mensagemErro);
      setItens([]);
      setPaginacao(paginacaoInicial(parametros.size));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) buscar(params);
    return () => { abortRef.current?.abort(); };
  }, [params, buscar, autoLoad]);

  const irParaPagina = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  const proximaPagina = useCallback(() => {
    if (paginacao.temProxima) setParams(prev => ({ ...prev, page: prev.page + 1 }));
  }, [paginacao.temProxima]);

  const paginaAnterior = useCallback(() => {
    if (paginacao.temAnterior) setParams(prev => ({ ...prev, page: Math.max(0, prev.page - 1) }));
  }, [paginacao.temAnterior]);

  const aplicarFiltros = useCallback((filtros: Partial<TParams>) => {
    setParams(prev => ({ ...prev, ...filtros, page: 0 }));
  }, []);

  const paramsIniciaisRef = useRef(paramsIniciais);
  const limparFiltros = useCallback((paramsLimpos?: TParams) => {
    setParams(paramsLimpos ?? { ...paramsIniciaisRef.current, page: 0 });
  }, []);

  const refetch = useCallback(() => {
    buscar(paramsRef.current);
  }, [buscar]);

  return {
    itens, paginacao, loading, error,
    filtrosAtivos: params,
    irParaPagina, proximaPagina, paginaAnterior,
    aplicarFiltros, limparFiltros, atualizarParams: setParams as (fn: (prev: TParams) => TParams) => void,
    refetch,
  };
}
