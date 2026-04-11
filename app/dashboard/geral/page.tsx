/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';
import { useCustodiadosPaginados } from '@/hooks/useCustodiadosPaginados';
import { exportarComFallback } from '@/services/exportacaoService';
import { useToast } from '@/components/Toast';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import type { CustodiadoData } from '@/types/api';
import {
  Search,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  User,
  FileText,
  SlidersHorizontal,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

function GeralPage() {
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'EM_CONFORMIDADE' | 'INADIMPLENTE'>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [filtroTextoDebounced, setFiltroTextoDebounced] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pula o primeiro render para não duplicar a requisição do autoLoad
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setFiltroTextoDebounced(filtroTexto);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filtroTexto]);

  const {
    custodiados,
    paginacao,
    loading,
    error,
    filtrosAtivos,
    irParaPagina,
    aplicarFiltros,
    limparFiltros: limparFiltrosHook,
    ordenarPor,
    refetch,
  } = useCustodiadosPaginados({
    size: PAGE_SIZE,
    autoLoad: true,
    filtrosIniciais: {
      nome: searchParams.get('busca') || undefined,
      status: searchParams.get('status') || undefined,
      ordenarPor: 'nome',
      direcao: 'asc',
    },
  });

  useEffect(() => {
    const busca = searchParams.get('busca');
    const status = searchParams.get('status') as typeof filtroStatus | null;
    if (busca) setFiltroTexto(busca);
    if (status && status !== 'todos') setFiltroStatus(status);
  }, [searchParams]);

  // Só aplica filtros a partir da segunda renderização (interação do usuário)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    aplicarFiltros({
      nome: filtroTextoDebounced || undefined,
      status: filtroStatus !== 'todos' ? filtroStatus : undefined,
    });
  }, [filtroTextoDebounced, filtroStatus, aplicarFiltros]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroTexto) params.set('busca', filtroTexto);
    if (filtroStatus !== 'todos') params.set('status', filtroStatus);
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, [filtroTexto, filtroStatus]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    let timer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timer);
      timer = setTimeout(checkMobile, 150);
    };
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timer);
    };
  }, []);

  const handleVerDetalhes = useCallback(
    (item: CustodiadoData) => {
      const id = (item as any).id || (item as any).publicId;
      router.push(`/dashboard/custodiados/${id}`);
    },
    [router]
  );

  const handleOrdenacao = useCallback(
    (coluna: 'nome' | 'status' | 'proximoComparecimento' | 'ultimoComparecimento') => {
      ordenarPor(coluna);
    },
    [ordenarPor]
  );

  const handleLimparFiltros = useCallback(() => {
    setFiltroTexto('');
    setFiltroStatus('todos');
    limparFiltrosHook();
  }, [limparFiltrosHook]);

  const handleExportar = useCallback(async () => {
    setIsExporting(true);
    try {
      const resultado = await exportarComFallback({
        nome: filtroTexto || undefined,
        status: filtroStatus !== 'todos' ? filtroStatus : undefined,
      });

      if (resultado.success) {
        showToast({
          type: 'success',
          title: 'Exportação concluída',
          message: resultado.message,
          duration: 4000,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Erro na exportação',
          message: resultado.message,
          duration: 5000,
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Erro inesperado ao exportar',
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  }, [filtroTexto, filtroStatus, showToast]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    showToast({
      type: 'success',
      title: 'Dados atualizados',
      message: 'Lista atualizada com sucesso.',
      duration: 3000,
    });
  }, [refetch, showToast]);

  const handlePageChange = useCallback(
    (page: number) => {
      irParaPagina(page);
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [irParaPagina]
  );

  const hasActiveFilters = filtroTexto || filtroStatus !== 'todos';
  const { paginaAtual, totalPaginas, totalItens } = paginacao;
  const startIndex = paginaAtual * paginacao.itensPorPagina;
  const endIndex = startIndex + custodiados.length;

  const isToday = (ds: string): boolean => {
    if (!ds) return false;
    const hoje = new Date();
    return (
      ds ===
      `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    );
  };

  const isOverdue = (ds: string): boolean => {
    if (!ds) return false;
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    const d = new Date(ds);
    d.setHours(0, 0, 0, 0);
    return d < h;
  };

  const getDaysUntil = (ds: string): number => {
    if (!ds) return 0;
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    const d = new Date(ds);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - h.getTime()) / 86400000);
  };

  if (loading && custodiados.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg text-gray-600">Carregando custodiados...</p>
        </div>
      </div>
    );
  }

  if (error && custodiados.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" ref={containerRef}>
      {isMobile ? (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-800">Custodiados</h1>
              <div className="flex gap-2">
                <button onClick={() => setShowFilters(!showFilters)} className="p-2 bg-primary text-white rounded-lg">
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
                <button onClick={handleExportar} disabled={isExporting} className="p-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                  {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                </button>
                <button onClick={handleRefresh} className="p-2 bg-gray-600 text-white rounded-lg">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome, CPF ou processo..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                  />
                </div>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="EM_CONFORMIDADE">Em Conformidade</option>
                  <option value="INADIMPLENTE">Inadimplente</option>
                </select>
                {hasActiveFilters && (
                  <button
                    onClick={handleLimparFiltros}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Limpar
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Total: {totalItens}</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </div>
          </div>

          <div className="space-y-3">
            {custodiados.map((item, index) => {
              const proximo = (item as any).proximoComparecimento || '';
              const hoje = isToday(proximo);
              const atrasado = isOverdue(proximo);
              const dias = getDaysUntil(proximo);
              const urgente = (item as any).urgente || false;
              const statusNorm =
                item.status === 'EM_CONFORMIDADE' ? 'em conformidade' : 'inadimplente';

              return (
                <div
                  key={(item as any).id || index}
                  className={`bg-white rounded-lg shadow-sm p-4 ${
                    urgente
                      ? 'border-l-4 border-red-500'
                      : atrasado
                        ? 'border-l-4 border-orange-500'
                        : hoje
                          ? 'border-l-4 border-yellow-500'
                          : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <User className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{item.nome}</h3>
                        <p className="text-xs text-gray-600">{item.cpf}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        statusNorm === 'inadimplente'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {statusNorm === 'inadimplente' ? 'Inadimplente' : 'Conforme'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.processo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <p
                        className={`text-xs ${
                          urgente
                            ? 'text-red-600 font-bold'
                            : atrasado
                              ? 'text-orange-600 font-medium'
                              : hoje
                                ? 'text-yellow-600 font-medium'
                                : ''
                        }`}
                      >
                        Próximo: {proximo ? formatToBrazilianDate(proximo) : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {urgente && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex-1 font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        URGENTE
                      </span>
                    )}
                    {!urgente && atrasado && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs flex-1">
                        <AlertTriangle className="w-3 h-3" />
                        {Math.abs(dias)}d atraso
                      </span>
                    )}
                    {!urgente && !atrasado && hoje && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-1">
                        <Clock className="w-3 h-3" />
                        Hoje
                      </span>
                    )}
                    <button
                      onClick={() => handleVerDetalhes(item)}
                      className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(paginaAtual - 1)}
                disabled={!paginacao.temAnterior}
                className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Página {paginaAtual + 1} de {totalPaginas}
              </span>
              <button
                onClick={() => handlePageChange(paginaAtual + 1)}
                disabled={!paginacao.temProxima}
                className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Gerenciamento de Custodiados
                </h1>
                <p className="text-gray-600">Visualize, filtre e gerencie todos os custodiados</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  Atualizar
                </button>
                <button
                  onClick={handleExportar}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exportar Excel
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome, CPF ou processo..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                  />
                  {loading && filtroTexto && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 text-primary animate-spin" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-lg"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as any)}
                >
                  <option value="todos">Todos</option>
                  <option value="EM_CONFORMIDADE">Em Conformidade</option>
                  <option value="INADIMPLENTE">Inadimplente</option>
                </select>
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={handleLimparFiltros}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Resultados ({totalItens})
                  {totalItens > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      • Página {paginaAtual + 1} de {totalPaginas}
                    </span>
                  )}
                </h3>
                {hasActiveFilters && (
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtros ativos
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-primary text-white">
                  <tr>
                    <th
                      className="p-3 text-left cursor-pointer hover:bg-primary-dark"
                      onClick={() => handleOrdenacao('nome')}
                    >
                      Nome / CPF{' '}
                      {filtrosAtivos.ordenarPor === 'nome' &&
                        (filtrosAtivos.direcao === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-3 text-left">Processo / Vara</th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-primary-dark"
                      onClick={() => handleOrdenacao('status')}
                    >
                      Status{' '}
                      {filtrosAtivos.ordenarPor === 'status' &&
                        (filtrosAtivos.direcao === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-primary-dark"
                      onClick={() => handleOrdenacao('ultimoComparecimento')}
                    >
                      Último{' '}
                      {filtrosAtivos.ordenarPor === 'ultimoComparecimento' &&
                        (filtrosAtivos.direcao === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-primary-dark"
                      onClick={() => handleOrdenacao('proximoComparecimento')}
                    >
                      Próximo{' '}
                      {filtrosAtivos.ordenarPor === 'proximoComparecimento' &&
                        (filtrosAtivos.direcao === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-3 text-center">Urgência</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {custodiados.map((item, index) => {
                    const proximo = (item as any).proximoComparecimento || '';
                    const hoje = (item as any).comparecimentoHoje || isToday(proximo);
                    const atrasado = (item as any).atrasado || isOverdue(proximo);
                    const dias = (item as any).diasAtraso || getDaysUntil(proximo);
                    const urgente = (item as any).urgente || false;
                    const statusNorm =
                      item.status === 'EM_CONFORMIDADE' ? 'em conformidade' : 'inadimplente';

                    return (
                      <tr
                        key={(item as any).id || index}
                        className={`border-b border-border hover:bg-gray-50 cursor-pointer ${
                          urgente
                            ? 'bg-red-50'
                            : atrasado
                              ? 'bg-orange-50'
                              : hoje
                                ? 'bg-yellow-50'
                                : ''
                        }`}
                        onClick={() => handleVerDetalhes(item)}
                      >
                        <td className="p-3">
                          <p className="font-medium text-text-base">{item.nome}</p>
                          <p className="text-sm text-text-muted">{item.cpf}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-mono text-text-muted">{item.processo}</p>
                          <p className="text-xs text-text-muted">{item.vara}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              statusNorm === 'inadimplente'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {statusNorm === 'inadimplente' ? 'Inadimplente' : 'Em Conformidade'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm">
                          {(item as any).ultimoComparecimento
                            ? formatToBrazilianDate((item as any).ultimoComparecimento)
                            : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <div
                            className={`text-sm font-medium ${
                              urgente
                                ? 'text-red-600 font-bold'
                                : atrasado
                                  ? 'text-orange-600'
                                  : hoje
                                    ? 'text-yellow-600'
                                    : 'text-text-base'
                            }`}
                          >
                            {proximo ? formatToBrazilianDate(proximo) : '-'}
                          </div>
                          <div className="text-xs text-text-muted">
                            {urgente
                              ? `URGENTE - ${Math.abs(dias)}d`
                              : atrasado
                                ? `${Math.abs(dias)}d atraso`
                                : hoje
                                  ? 'Hoje'
                                  : dias > 0
                                    ? `${dias}d`
                                    : ''}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {urgente && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              URGENTE
                            </span>
                          )}
                          {!urgente && atrasado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Atrasado
                            </span>
                          )}
                          {!urgente && !atrasado && hoje && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              <Clock className="w-3 h-3" />
                              Hoje
                            </span>
                          )}
                          {!urgente && !atrasado && !hoje && dias <= 7 && dias > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              <Clock className="w-3 h-3" />
                              Próximo
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerDetalhes(item);
                            }}
                            className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark"
                          >
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {endIndex} de {totalItens}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(paginaAtual - 1)}
                      disabled={!paginacao.temAnterior || loading}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                        let pn: number;
                        if (totalPaginas <= 5) pn = i;
                        else if (paginaAtual <= 2) pn = i;
                        else if (paginaAtual >= totalPaginas - 3) pn = totalPaginas - 5 + i;
                        else pn = paginaAtual - 2 + i;
                        return (
                          <button
                            key={pn}
                            onClick={() => handlePageChange(pn)}
                            disabled={loading}
                            className={`px-3 py-2 text-sm rounded-lg ${
                              paginaAtual === pn
                                ? 'bg-primary text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pn + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handlePageChange(paginaAtual + 1)}
                      disabled={!paginacao.temProxima || loading}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {custodiados.length === 0 && !loading && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado</h3>
                <p className="text-gray-500 mb-4">Tente ajustar os filtros</p>
                <button
                  onClick={handleLimparFiltros}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            Dados carregados em {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      )}
    </div>
  );
}

export default withSearchParams(GeralPage);
