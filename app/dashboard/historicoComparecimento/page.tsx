/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { comparecimentosService } from '@/lib/api/services';
import { httpClient } from '@/lib/http/client';
import type { ComparecimentoResponse } from '@/types/api';
import ExportButton from '@/components/ExportButton';
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
} from 'lucide-react';

import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';

interface HistoricoFormatado extends ComparecimentoResponse {
  custodiadoNomeCompleto?: string;
  tipoValidacaoFormatado?: string;
  dataFormatada?: string;
  horaFormatada?: string;
  numeroProcesso?: string;
}

const TipoValidacaoUtils = {
  normalize(tipo: string): string { return tipo.toLowerCase(); },
  format(tipo: string): string {
    const f: Record<string, string> = { 'presencial': 'Presencial', 'online': 'Online', 'cadastro_inicial': 'Cadastro Inicial' };
    return f[tipo.toLowerCase()] || tipo;
  },
  isEqual(t1: string, t2: string): boolean { return t1.toLowerCase() === t2.toLowerCase(); }
};

const dateUtils = {
  parseLocalDate: (ds: string): Date => { if (!ds) return new Date(); const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); },
  formatarData: (data: string): string => {
    if (!data) return '';
    try { const d = dateUtils.parseLocalDate(data); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }
    catch { return data; }
  }
};

function HistoricoPage() {
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { showToast } = useToast();

  const [historicos, setHistoricos] = useState<HistoricoFormatado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtro, setFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipoValidacao, setFiltroTipoValidacao] = useState<'todos' | string>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileExport, setShowMobileExport] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const processoCacheRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const buscarProcessosPorCustodiado = useCallback(async (custodiadoIds: number[]) => {
    const idsParaBuscar = custodiadoIds.filter(id => id > 0 && !processoCacheRef.current.has(id));
    const uniqueIds = [...new Set(idsParaBuscar)];
    if (uniqueIds.length === 0) return;

    const promises = uniqueIds.map(async (custodiadoId) => {
      try {
        const resp = await httpClient.get<any>(`/processos/custodiado/${custodiadoId}`);
        if (resp.success && resp.data) {
          const lista = resp.data?.data || resp.data || [];
          const procs = Array.isArray(lista) ? lista : [];
          const ativos = procs.filter((p: any) => p.situacaoProcesso === 'ATIVO');
          if (ativos.length > 0) {
            processoCacheRef.current.set(custodiadoId, ativos.map((p: any) => p.numeroProcesso).join(', '));
          } else if (procs.length > 0) {
            processoCacheRef.current.set(custodiadoId, procs[0].numeroProcesso || '');
          } else {
            processoCacheRef.current.set(custodiadoId, '');
          }
        }
      } catch {
        processoCacheRef.current.set(custodiadoId, '');
      }
    });

    await Promise.allSettled(promises);
  }, []);

  const carregarHistoricos = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await comparecimentosService.listarTodos({ page: 0, size: 1000 });
      if (response.success && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.comparecimentos || [];
        const formatted: HistoricoFormatado[] = raw.map((h: ComparecimentoResponse) => ({
          ...h,
          custodiadoNomeCompleto: h.custodiadoNome || 'Nome não informado',
          tipoValidacaoFormatado: TipoValidacaoUtils.format(h.tipoValidacao),
          dataFormatada: dateUtils.formatarData(h.dataComparecimento),
          horaFormatada: h.horaComparecimento ? h.horaComparecimento.substring(0, 5) : '—',
          numeroProcesso: (h as any).processoCustodiado || (h as any).numeroProcesso || ''
        }));

        setHistoricos(formatted);

        const semProcesso = formatted.filter(h => !h.numeroProcesso && h.custodiadoId);
        if (semProcesso.length > 0) {
          const ids = semProcesso.map(h => h.custodiadoId).filter(Boolean) as number[];
          await buscarProcessosPorCustodiado(ids);
          setHistoricos(prev => prev.map(h => {
            if (!h.numeroProcesso && h.custodiadoId && processoCacheRef.current.has(h.custodiadoId)) {
              return { ...h, numeroProcesso: processoCacheRef.current.get(h.custodiadoId) || '' };
            }
            return h;
          }));
        }
      } else { throw new Error(response.message || 'Erro ao carregar históricos'); }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar históricos');
      showToast({ type: 'error', title: 'Erro', message: err.message || 'Falha ao carregar', duration: 5000 });
    } finally { setLoading(false); }
  }, [showToast, buscarProcessosPorCustodiado]);

  useEffect(() => { carregarHistoricos(); }, [carregarHistoricos]);

  useEffect(() => {
    const b = searchParams.get('busca'), t = searchParams.get('tipo'), di = searchParams.get('dataInicio'), df = searchParams.get('dataFim');
    if (b) setFiltro(b); if (t) setFiltroTipoValidacao(TipoValidacaoUtils.normalize(t));
    if (di) setDataInicio(di); if (df) setDataFim(df);
  }, [searchParams]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (filtro) p.set('busca', filtro); if (filtroTipoValidacao !== 'todos') p.set('tipo', filtroTipoValidacao);
    if (dataInicio) p.set('dataInicio', dataInicio); if (dataFim) p.set('dataFim', dataFim);
    const qs = p.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    setCurrentPage(1);
  }, [filtro, filtroTipoValidacao, dataInicio, dataFim]);

  const norm = useCallback((t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(), []);

  const filtrarDados = useCallback((data: HistoricoFormatado[]): HistoricoFormatado[] => {
    return data.filter(item => {
      const termo = filtro.trim();
      let mt = true;
      if (termo.length > 0) {
        const tn = norm(termo);
        mt = norm(item.custodiadoNomeCompleto || '').includes(tn) ||
          norm(item.numeroProcesso || '').includes(tn);
      }
      const mTipo = filtroTipoValidacao === 'todos' || TipoValidacaoUtils.isEqual(item.tipoValidacao, filtroTipoValidacao);
      let mData = true;
      if (dataInicio || dataFim) {
        const dc = item.dataComparecimento;
        if (dataInicio && dc < dataInicio) mData = false;
        if (dataFim && dc > dataFim) mData = false;
      }
      return mt && mTipo && mData;
    });
  }, [filtro, filtroTipoValidacao, dataInicio, dataFim, norm]);

  const ordenar = useCallback((d: HistoricoFormatado[]) => [...d].sort((a, b) => b.dataComparecimento.localeCompare(a.dataComparecimento)), []);
  const dadosFiltrados = useMemo(() => ordenar(filtrarDados(historicos)), [historicos, filtrarDados, ordenar]);

  const totalFiltrados = dadosFiltrados.length;
  const totalPages = Math.ceil(totalFiltrados / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const dadosPaginados = dadosFiltrados.slice(startIdx, endIdx);

  const goPage = (p: number) => { if (p >= 1 && p <= totalPages) { setCurrentPage(p); containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  const limpar = () => { setFiltro(''); setFiltroTipoValidacao('todos'); setDataInicio(''); setDataFim(''); setCurrentPage(1); };
  const hasFilters = filtro !== '' || filtroTipoValidacao !== 'todos' || dataInicio !== '' || dataFim !== '';

  const tipoBadge = (tipo: string) => {
    if (TipoValidacaoUtils.isEqual(tipo, 'presencial')) return 'bg-green-100 text-green-800';
    if (TipoValidacaoUtils.isEqual(tipo, 'online')) return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center"><RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin mb-4" /><p className="text-lg text-text-base">Carregando históricos...</p></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={carregarHistoricos} className="flex items-center gap-2 mx-auto bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"><RefreshCw className="w-4 h-4" />Tentar Novamente</button>
      </div>
    </div>
  );

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
          <button onClick={limpar} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-2"><X className="w-4 h-4" />Limpar</button>
        </div>
      )}
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{startIdx + 1} a {Math.min(endIdx, totalFiltrados)} de {totalFiltrados}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" />Anterior</button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pn; if (totalPages <= 5) pn = i + 1; else if (currentPage <= 3) pn = i + 1; else if (currentPage >= totalPages - 2) pn = totalPages - 4 + i; else pn = currentPage - 2 + i;
                return <button key={pn} onClick={() => goPage(pn)} className={`px-3 py-2 text-sm rounded-lg ${currentPage === pn ? 'bg-primary text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>{pn}</button>;
              })}
            </div>
            <button onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Próxima<ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      {isMobile ? (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-6 h-6 text-primary" />Histórico</h1>
              <div className="flex gap-2">
                <button onClick={() => setShowMobileExport(!showMobileExport)} className="px-3 py-2 bg-secondary text-white rounded-lg text-sm font-medium">Exportar</button>
                <button onClick={carregarHistoricos} className="p-2 bg-primary text-white rounded-lg"><RefreshCw className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Buscar custodiado ou processo..." className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" value={filtro} onChange={e => setFiltro(e.target.value)} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Filter className="w-4 h-4" />Filtros{hasFilters && <span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>}
            </button>
          </div>

          {showMobileExport && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-800">Exportar</h3><button onClick={() => setShowMobileExport(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
              <ExportButton dados={historicos} dadosFiltrados={dadosFiltrados} filterInfo={{ filtro, status: filtroTipoValidacao, dataInicio, dataFim }} exportType="historico" />
            </div>
          )}

          {showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-gray-800 flex items-center gap-2"><Filter className="w-4 h-4" />Filtros</h3><button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg" value={filtroTipoValidacao} onChange={e => setFiltroTipoValidacao(e.target.value)}>
                  <option value="todos">Todos</option><option value="presencial">Presencial</option><option value="online">Online</option><option value="cadastro_inicial">Cadastro Inicial</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">De</label><input type="date" className="w-full px-3 py-2 border border-border rounded-lg" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Até</label><input type="date" className="w-full px-3 py-2 border border-border rounded-lg" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
              </div>
              {hasFilters && <button onClick={limpar} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2"><X className="w-4 h-4" />Limpar</button>}
            </div>
          )}

          <div className="space-y-3">
            {dadosPaginados.map((item, i) => (
              <div key={item.id || i} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{item.custodiadoNomeCompleto}</h3>
                    {item.mudancaEndereco && (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium"><MapPin className="w-3 h-3" />Mudança end.</span>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${tipoBadge(item.tipoValidacao)}`}>{item.tipoValidacaoFormatado}</span>
                </div>
                {item.numeroProcesso && <p className="text-xs text-gray-500 font-mono mb-1.5 truncate">{item.numeroProcesso}</p>}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{item.dataFormatada}</span>
                  <span className="text-gray-300">·</span>
                  <span>{item.horaFormatada}</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" />Ant.</button>
                <span className="text-sm text-gray-600">{currentPage} / {totalPages}</span>
                <button onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50">Próx.<ChevronRight className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">{startIdx + 1}–{Math.min(endIdx, totalFiltrados)} de {totalFiltrados}</p>
            </div>
          )}

          {dadosFiltrados.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado</h3>
              <button onClick={limpar} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">Limpar Filtros</button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><Calendar className="w-8 h-8 text-primary" />Histórico de Comparecimentos</h1>
              <p className="text-text-muted mt-1">Registro completo de todos os comparecimentos</p>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton dados={historicos} dadosFiltrados={dadosFiltrados} filterInfo={{ filtro, status: filtroTipoValidacao, dataInicio, dataFim }} exportType="historico" />
              <button onClick={carregarHistoricos} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium"><RefreshCw className="w-5 h-5" />Atualizar</button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Buscar por custodiado ou nº do processo..." className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" value={filtro} onChange={e => setFiltro(e.target.value)} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${hasFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <Filter className="w-5 h-5" />Filtros{hasFilters && <span className="ml-1 bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>}
              </button>
            </div>
            {showFilters && renderFilters()}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  {totalFiltrados} {totalFiltrados === 1 ? 'registro' : 'registros'}
                  {totalFiltrados > 0 && <span className="text-sm text-gray-600 font-normal ml-2">· Página {currentPage} de {totalPages}</span>}
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
                  {dadosPaginados.map((item, i) => (
                    <tr key={item.id || i} className="border-b border-border hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-base">{item.custodiadoNomeCompleto}</p>
                          {item.mudancaEndereco && (
                            <button onClick={() => router.push(`/dashboard/historicoComparecimento/enderecos/${item.custodiadoId}`)}
                              className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 transition-colors" title="Mudança de endereço">
                              <MapPin className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {item.numeroProcesso ? (
                          <p className="text-sm font-mono text-gray-600 truncate max-w-[220px]">{item.numeroProcesso}</p>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-sm text-gray-700">{item.dataFormatada}</td>
                      <td className="p-3 text-center text-sm text-gray-500">{item.horaFormatada}</td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${tipoBadge(item.tipoValidacao)}`}>{item.tipoValidacaoFormatado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderPagination()}

            {dadosFiltrados.length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 mb-4">Tente ajustar os filtros</p>
                <button onClick={limpar} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">Limpar Filtros</button>
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
