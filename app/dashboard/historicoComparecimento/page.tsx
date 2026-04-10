/**
 * ═══════════════════════════════════════════════════════════════
 * PÁGINA: Histórico de Comparecimentos (REFATORADA)
 * ═══════════════════════════════════════════════════════════════
 *
 * CORREÇÕES DE PERFORMANCE APLICADAS:
 *
 * 1. CORREÇÃO 2 — ELIMINAÇÃO DO N+1:
 *    Antes: após carregar comparecimentos, iterava sobre cada um
 *    sem `numeroProcesso` e fazia GET /processos/custodiado/{id}
 *    para cada custodiado (até 200 requisições).
 *    Agora: o backend já inclui `numeroProcesso` na resposta.
 *    O loop inteiro de `buscarProcessosPorCustodiado` foi REMOVIDO.
 *
 * 2. CORREÇÃO 3 — PAGINAÇÃO SERVER-SIDE:
 *    Antes: carregava 1000 registros de uma vez com size=1000.
 *    Agora: carrega 50 por vez com paginação real.
 *    Filtros são enviados como query params e aplicados no SQL.
 *
 * 3. EXPORTAÇÃO SERVER-SIDE:
 *    Usa o endpoint do backend para gerar planilha diretamente.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';
import { useComparecimentosPaginados } from '@/hooks/useComparecimentosPaginados';
import { exportarComFallback } from '@/services/exportacaoService';
import { useToast } from '@/components/Toast';
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  MapPin,
  Loader2,
  Download,
} from 'lucide-react';

// ── Constantes ──────────────────────────────────────────────

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 400;

// ── Componente principal ────────────────────────────────────

function HistoricoPage() {
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Estado de UI ──────────────────────────────────────────

  const [filtroTexto, setFiltroTexto] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipoValidacao, setFiltroTipoValidacao] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ── Debounce para filtro de texto ─────────────────────────

  const [filtroTextoDebounced, setFiltroTextoDebounced] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setFiltroTextoDebounced(filtroTexto);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filtroTexto]);

  // ── Hook de paginação server-side ─────────────────────────
  // CORREÇÃO 3: Não carrega mais 1000 registros de uma vez.
  // CORREÇÃO 2: Não faz mais loop de busca de processos.

  const {
    comparecimentos,
    paginacao,
    loading,
    error,
    irParaPagina,
    aplicarFiltros,
    limparFiltros: limparFiltrosHook,
    refetch,
  } = useComparecimentosPaginados({
    size: PAGE_SIZE,
    autoLoad: true,
    filtrosIniciais: {
      custodiadoNome: searchParams.get('busca') || undefined,
      tipoValidacao: searchParams.get('tipo') || undefined,
      dataInicio: searchParams.get('dataInicio') || undefined,
      dataFim: searchParams.get('dataFim') || undefined,
    },
  });

  // ── Sincronizar filtros com URL ───────────────────────────

  useEffect(() => {
    const b = searchParams.get('busca');
    const t = searchParams.get('tipo');
    const di = searchParams.get('dataInicio');
    const df = searchParams.get('dataFim');
    if (b) setFiltroTexto(b);
    if (t) setFiltroTipoValidacao(t);
    if (di) setDataInicio(di);
    if (df) setDataFim(df);
  }, [searchParams]);

  // ── Aplicar filtros debounced ao backend ──────────────────

  useEffect(() => {
    aplicarFiltros({
      custodiadoNome: filtroTextoDebounced || undefined,
      tipoValidacao: filtroTipoValidacao !== 'todos' ? filtroTipoValidacao.toUpperCase() : undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    });
  }, [filtroTextoDebounced, filtroTipoValidacao, dataInicio, dataFim, aplicarFiltros]);

  // ── Atualizar URL ─────────────────────────────────────────

  useEffect(() => {
    const p = new URLSearchParams();
    if (filtroTexto) p.set('busca', filtroTexto);
    if (filtroTipoValidacao !== 'todos') p.set('tipo', filtroTipoValidacao);
    if (dataInicio) p.set('dataInicio', dataInicio);
    if (dataFim) p.set('dataFim', dataFim);
    const qs = p.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [filtroTexto, filtroTipoValidacao, dataInicio, dataFim]);

  // ── Responsive ────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    let timer: NodeJS.Timeout;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(check, 150); };
    window.addEventListener('resize', debounced);
    return () => { window.removeEventListener('resize', debounced); clearTimeout(timer); };
  }, []);

  // ── Handlers ──────────────────────────────────────────────

  const handleLimpar = useCallback(() => {
    setFiltroTexto('');
    setFiltroTipoValidacao('todos');
    setDataInicio('');
    setDataFim('');
    limparFiltrosHook();
  }, [limparFiltrosHook]);

  const handleExportar = useCallback(async () => {
    setIsExporting(true);
    try {
      const resultado = await exportarComFallback({
        nome: filtroTexto || undefined,
        status: filtroTipoValidacao !== 'todos' ? filtroTipoValidacao : undefined,
      });
      showToast({
        type: resultado.success ? 'success' : 'error',
        title: resultado.success ? 'Exportação concluída' : 'Erro na exportação',
        message: resultado.message,
        duration: 4000,
      });
    } finally {
      setIsExporting(false);
    }
  }, [filtroTexto, filtroTipoValidacao, showToast]);

  const goPage = useCallback((p: number) => {
    irParaPagina(p);
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [irParaPagina]);

  // ── Variáveis derivadas ───────────────────────────────────

  const hasFilters = filtroTexto || filtroTipoValidacao !== 'todos' || dataInicio || dataFim;
  const { paginaAtual, totalPaginas, totalItens } = paginacao;
  const startIdx = paginaAtual * paginacao.itensPorPagina;
  const endIdx = startIdx + comparecimentos.length;

  // ── Utilitários de exibição ───────────────────────────────

  const tipoBadge = (tipo: string) => {
    const t = tipo?.toLowerCase() || '';
    if (t === 'presencial') return 'bg-green-100 text-green-800';
    if (t === 'online') return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  const formatarTipo = (tipo: string) => {
    const f: Record<string, string> = { presencial: 'Presencial', online: 'Online', cadastro_inicial: 'Cadastro Inicial' };
    return f[tipo?.toLowerCase()] || tipo;
  };

  // ── Loading / Error ───────────────────────────────────────

  if (loading && comparecimentos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-lg text-text-base">Carregando históricos...</p>
        </div>
      </div>
    );
  }

  if (error && comparecimentos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 mx-auto bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">
            <RefreshCw className="w-4 h-4" />Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Componente de filtros ─────────────────────────────────

  const renderFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Validação</label>
        <select className="w-full px-3 py-2 border border-border rounded-lg" value={filtroTipoValidacao} onChange={e => setFiltroTipoValidacao(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
          <option value="cadastro_inicial">Cadastro Inicial</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
        <input type="date" className="w-full px-3 py-2 border border-border rounded-lg" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
        <input type="date" className="w-full px-3 py-2 border border-border rounded-lg" value={dataFim} onChange={e => setDataFim(e.target.value)} />
      </div>
      {hasFilters && (
        <div className="flex items-end">
          <button onClick={handleLimpar} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-2">
            <X className="w-4 h-4" />Limpar
          </button>
        </div>
      )}
    </div>
  );

  // ── Componente de paginação ───────────────────────────────

  const renderPagination = () => {
    if (totalPaginas <= 1) return null;
    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{startIdx + 1} a {Math.min(endIdx, totalItens)} de {totalItens}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => goPage(paginaAtual - 1)} disabled={!paginacao.temAnterior || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                let pn: number;
                if (totalPaginas <= 5) pn = i;
                else if (paginaAtual <= 2) pn = i;
                else if (paginaAtual >= totalPaginas - 3) pn = totalPaginas - 5 + i;
                else pn = paginaAtual - 2 + i;
                return <button key={pn} onClick={() => goPage(pn)} disabled={loading}
                  className={`px-3 py-2 text-sm rounded-lg ${paginaAtual === pn ? 'bg-primary text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>{pn + 1}</button>;
              })}
            </div>
            <button onClick={() => goPage(paginaAtual + 1)} disabled={!paginacao.temProxima || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Próxima<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      {isMobile ? (
        /* ══════ MOBILE ══════ */
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />Histórico
              </h1>
              <div className="flex gap-2">
                <button onClick={handleExportar} disabled={isExporting} className="px-3 py-2 bg-secondary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Exportar'}
                </button>
                <button onClick={() => refetch()} className="p-2 bg-primary text-white rounded-lg">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Buscar custodiado ou processo..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
              {loading && filtroTexto && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
            </div>

            <button onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Filter className="w-4 h-4" />Filtros{hasFilters && <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>}
            </button>
          </div>

          {showFilters && <div className="bg-white rounded-lg shadow-sm p-4">{renderFilters()}</div>}

          {/* Cards mobile */}
          <div className="space-y-3">
            {comparecimentos.map((item: any, i: number) => (
              <div key={item.id || i} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{item.custodiadoNome || 'Não informado'}</h3>
                    {item.mudancaEndereco && (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium"><MapPin className="w-3 h-3" />Mudança end.</span>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${tipoBadge(item.tipoValidacao)}`}>
                    {item.tipoValidacaoFormatado || formatarTipo(item.tipoValidacao)}
                  </span>
                </div>
                {/* CORREÇÃO 2: numeroProcesso vem direto do backend, sem requisição extra */}
                {item.numeroProcesso && <p className="text-xs text-gray-500 font-mono mb-1.5 truncate">{item.numeroProcesso}</p>}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{item.dataFormatada || item.dataComparecimento}</span>
                  <span className="text-gray-300">·</span>
                  <span>{item.horaFormatada || (item.horaComparecimento ? item.horaComparecimento.substring(0, 5) : '—')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação mobile */}
          {totalPaginas > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <button onClick={() => goPage(paginaAtual - 1)} disabled={!paginacao.temAnterior} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />Ant.
                </button>
                <span className="text-sm text-gray-600">{paginaAtual + 1} / {totalPaginas}</span>
                <button onClick={() => goPage(paginaAtual + 1)} disabled={!paginacao.temProxima} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50">
                  Próx.<ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">{startIdx + 1}–{Math.min(endIdx, totalItens)} de {totalItens}</p>
            </div>
          )}

          {comparecimentos.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado</h3>
              <button onClick={handleLimpar} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">Limpar Filtros</button>
            </div>
          )}
        </div>
      ) : (
        /* ══════ DESKTOP ══════ */
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><Calendar className="w-8 h-8 text-primary" />Histórico de Comparecimentos</h1>
              <p className="text-text-muted mt-1">Registro completo de todos os comparecimentos</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExportar} disabled={isExporting}
                className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50">
                {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" />Exportando...</> : <><Download className="w-4 h-4" />Exportar</>}
              </button>
              <button onClick={() => refetch()} disabled={loading}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}Atualizar
              </button>
            </div>
          </div>

          {/* Busca e filtros */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Buscar por custodiado ou nº do processo..."
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
                {loading && filtroTexto && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${hasFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <Filter className="w-5 h-5" />Filtros{hasFilters && <span className="ml-1 bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>}
              </button>
            </div>
            {showFilters && renderFilters()}
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  {totalItens} {totalItens === 1 ? 'registro' : 'registros'}
                  {totalItens > 0 && <span className="text-sm text-gray-600 font-normal ml-2">· Página {paginaAtual + 1} de {totalPaginas}</span>}
                </h3>
                {hasFilters && <span className="text-sm text-gray-600 flex items-center gap-1"><Filter className="w-4 h-4" />Filtros ativos</span>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] table-auto">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="p-3 text-left">Custodiado</th>
                    <th className="p-3 text-left w-56">Processo</th>
                    <th className="p-3 text-center w-28">Data</th>
                    <th className="p-3 text-center w-20">Hora</th>
                    <th className="p-3 text-center w-32">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {comparecimentos.map((item: any, i: number) => (
                    <tr key={item.id || i} className="border-b border-border hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-base">{item.custodiadoNome || 'Não informado'}</p>
                          {item.mudancaEndereco && (
                            <button onClick={() => router.push(`/dashboard/historicoComparecimento/enderecos/${item.custodiadoId}`)}
                              className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 transition-colors" title="Mudança de endereço">
                              <MapPin className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {/* CORREÇÃO 2: numeroProcesso vem direto do backend */}
                        {item.numeroProcesso
                          ? <p className="text-sm font-mono text-gray-600 truncate max-w-[220px]">{item.numeroProcesso}</p>
                          : <span className="text-sm text-gray-400">—</span>
                        }
                      </td>
                      <td className="p-3 text-center text-sm text-gray-700">{item.dataFormatada || item.dataComparecimento}</td>
                      <td className="p-3 text-center text-sm text-gray-500">{item.horaFormatada || (item.horaComparecimento ? item.horaComparecimento.substring(0, 5) : '—')}</td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${tipoBadge(item.tipoValidacao)}`}>
                          {item.tipoValidacaoFormatado || formatarTipo(item.tipoValidacao)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderPagination()}

            {comparecimentos.length === 0 && !loading && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 mb-4">Tente ajustar os filtros</p>
                <button onClick={handleLimpar} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">Limpar Filtros</button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-500">Dados atualizados em: {new Date().toLocaleTimeString('pt-BR')}</div>
        </div>
      )}
    </div>
  );
}

export default withSearchParams(HistoricoPage);
