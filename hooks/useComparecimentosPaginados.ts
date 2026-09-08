'use client';

// Wrapper fino sobre usePaginacao: configuracao da listagem de comparecimentos
// (endpoint /todos, formatacao de exibicao por item).

import { usePaginacao } from '@/hooks/usePaginacao';
import type {
  ComparecimentosPaginadosParams,
  ComparecimentoComProcesso,
  PaginacaoMeta,
} from '@/types/pagination';

interface Options {
  size?: number;
  autoLoad?: boolean;
  filtrosIniciais?: {
    dataInicio?: string;
    dataFim?: string;
    tipoValidacao?: string;
    custodiadoNome?: string;
    numeroProcesso?: string;
    natureza?: string;
  };
}

interface Retorno {
  comparecimentos: ComparecimentoComProcesso[];
  paginacao: PaginacaoMeta;
  loading: boolean;
  error: string | null;
  filtrosAtivos: Partial<ComparecimentosPaginadosParams>;
  irParaPagina: (page: number) => void;
  proximaPagina: () => void;
  paginaAnterior: () => void;
  aplicarFiltros: (filtros: Partial<ComparecimentosPaginadosParams>) => void;
  limparFiltros: () => void;
  refetch: () => void;
}

const ROTULOS_TIPO: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  cadastro_inicial: 'Cadastro Inicial',
  falta_justificada: 'Falta Justificada',
};

const formatarData = (data: string): string => {
  if (!data) return '';
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
};

export function useComparecimentosPaginados(options: Options = {}): Retorno {
  const { size = 50, autoLoad = true, filtrosIniciais = {} } = options;

  const nucleo = usePaginacao<ComparecimentosPaginadosParams, ComparecimentoComProcesso>({
    endpoint: '/comparecimentos/todos',
    autoLoad,
    mensagemErro: 'Erro ao carregar comparecimentos',
    paramsIniciais: {
      page: 0,
      size,
      dataInicio: filtrosIniciais.dataInicio,
      dataFim: filtrosIniciais.dataFim,
      tipoValidacao: filtrosIniciais.tipoValidacao,
      natureza: filtrosIniciais.natureza,
      custodiadoNome: filtrosIniciais.custodiadoNome,
      numeroProcesso: filtrosIniciais.numeroProcesso,
    },
    extrairLista: dados => {
      if (Array.isArray(dados.comparecimentos)) return dados.comparecimentos;
      const aninhado = dados.data as Record<string, unknown> | undefined;
      if (aninhado && Array.isArray(aninhado.comparecimentos)) return aninhado.comparecimentos;
      if (Array.isArray(dados)) return dados;
      if (Array.isArray(dados.data)) return dados.data;
      return [];
    },
    mapearItem: bruto => {
      const item = bruto as ComparecimentoComProcesso;
      const tipo = (item.tipoValidacao || '').toLowerCase();
      return {
        ...item,
        tipoValidacaoFormatado: ROTULOS_TIPO[tipo] || item.tipoValidacao,
        dataFormatada: formatarData(item.dataComparecimento),
        horaFormatada: item.horaComparecimento ? item.horaComparecimento.substring(0, 5) : '—',
      };
    },
  });

  return {
    comparecimentos: nucleo.itens,
    paginacao: nucleo.paginacao,
    loading: nucleo.loading,
    error: nucleo.error,
    filtrosAtivos: nucleo.filtrosAtivos,
    irParaPagina: nucleo.irParaPagina,
    proximaPagina: nucleo.proximaPagina,
    paginaAnterior: nucleo.paginaAnterior,
    aplicarFiltros: nucleo.aplicarFiltros,
    limparFiltros: () => nucleo.limparFiltros({ page: 0, size }),
    refetch: nucleo.refetch,
  };
}
