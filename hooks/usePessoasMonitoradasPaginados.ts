'use client';

// Wrapper fino sobre usePaginacao: so a configuracao da listagem de pessoas
// (endpoint, defaults, ordenacao e os gatilhos de refetch entre telas).

import { useCallback, useEffect } from 'react';
import { usePaginacao } from '@/hooks/usePaginacao';
import type { PessoaMonitoradaListItem } from '@/types/api';
import type { PessoasMonitoradasPaginadosParams, PaginacaoMeta } from '@/types/pagination';

interface Options {
  size?: number;
  autoLoad?: boolean;
  filtrosIniciais?: {
    nome?: string;
    cpf?: string;
    status?: string;
    natureza?: PessoasMonitoradasPaginadosParams['natureza'];
    ordenarPor?: PessoasMonitoradasPaginadosParams['ordenarPor'];
    direcao?: PessoasMonitoradasPaginadosParams['direcao'];
  };
}

interface Retorno {
  custodiados: PessoaMonitoradaListItem[];
  paginacao: PaginacaoMeta;
  loading: boolean;
  error: string | null;
  filtrosAtivos: Partial<PessoasMonitoradasPaginadosParams>;
  irParaPagina: (page: number) => void;
  proximaPagina: () => void;
  paginaAnterior: () => void;
  aplicarFiltros: (filtros: Partial<PessoasMonitoradasPaginadosParams>) => void;
  limparFiltros: () => void;
  ordenarPor: (campo: PessoasMonitoradasPaginadosParams['ordenarPor'], direcao?: 'asc' | 'desc') => void;
  refetch: () => void;
}

export function usePessoasMonitoradasPaginados(options: Options = {}): Retorno {
  const { size = 20, autoLoad = true, filtrosIniciais = {} } = options;

  const nucleo = usePaginacao<PessoasMonitoradasPaginadosParams, PessoaMonitoradaListItem>({
    endpoint: '/pessoas-monitoradas',
    autoLoad,
    mensagemErro: 'Erro ao carregar custodiados',
    paramsIniciais: {
      page: 0,
      size,
      nome: filtrosIniciais.nome,
      cpf: filtrosIniciais.cpf,
      status: filtrosIniciais.status,
      natureza: filtrosIniciais.natureza,
      ordenarPor: filtrosIniciais.ordenarPor || 'nome',
      direcao: filtrosIniciais.direcao || 'asc',
    },
    extrairLista: dados =>
      Array.isArray(dados) ? dados : Array.isArray(dados.data) ? dados.data : [],
  });

  const { refetch } = nucleo;

  // outras telas avisam que a lista envelheceu (registro/edicao em outra rota)
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('comparecimento-registrado', handler);
    window.addEventListener('custodiado-atualizado', handler);
    return () => {
      window.removeEventListener('comparecimento-registrado', handler);
      window.removeEventListener('custodiado-atualizado', handler);
    };
  }, [refetch]);

  useEffect(() => {
    const consumirNeedsRefetch = () => {
      if (sessionStorage.getItem('needsRefetch') === 'true') {
        sessionStorage.removeItem('needsRefetch');
        sessionStorage.removeItem('lastUpdate');
        refetch();
      }
    };
    consumirNeedsRefetch();
    window.addEventListener('focus', consumirNeedsRefetch);
    return () => window.removeEventListener('focus', consumirNeedsRefetch);
  }, [refetch]);

  const ordenarPor = useCallback((
    campo: PessoasMonitoradasPaginadosParams['ordenarPor'],
    direcao?: 'asc' | 'desc'
  ) => {
    nucleo.atualizarParams(prev => ({
      ...prev,
      ordenarPor: campo,
      direcao: direcao || (prev.ordenarPor === campo && prev.direcao === 'asc' ? 'desc' : 'asc'),
      page: 0,
    }));
  }, [nucleo]);

  const limparFiltros = useCallback(() => {
    nucleo.limparFiltros({ page: 0, size, ordenarPor: 'nome', direcao: 'asc' });
  }, [nucleo, size]);

  return {
    custodiados: nucleo.itens,
    paginacao: nucleo.paginacao,
    loading: nucleo.loading,
    error: nucleo.error,
    filtrosAtivos: nucleo.filtrosAtivos,
    irParaPagina: nucleo.irParaPagina,
    proximaPagina: nucleo.proximaPagina,
    paginaAnterior: nucleo.paginaAnterior,
    aplicarFiltros: nucleo.aplicarFiltros,
    limparFiltros,
    ordenarPor,
    refetch,
  };
}
