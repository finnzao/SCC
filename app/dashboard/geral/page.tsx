/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustodiados } from '@/hooks/useAPI';
import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';
import type { CustodiadoData } from '@/types/api';
import DetalhesCustodiadoModal from '@/components/DetalhesCustodiado';
import EditarCustodiadoModal from '@/components/EditarCustodiado';
import ExportButton from '@/components/ExportButton';
import { useToast } from '@/components/Toast';
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
  MapPin
} from 'lucide-react';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';


interface CustodiadoFormatado {
  id: string;
  numericId: number;
  nome: string;
  cpf: string;
  rg: string;
  contato: string;
  processo: string;
  vara: string;
  comarca: string;
  decisao: string;
  periodicidade: number;
  status: 'em conformidade' | 'inadimplente';
  primeiroComparecimento: string;
  dataComparecimentoInicial: string;
  ultimoComparecimento: string;
  proximoComparecimento: string;
  endereco?: {
    cep: string;
    logradouro: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  observacoes?: string;
  atrasado?: boolean;
  diasAtraso?: number;
  comparecimentoHoje?: boolean;
  urgente?: boolean;
  enderecoCompleto?: string;
  cidadeEstado?: string;
}


function GeralPage() {
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { showToast } = useToast();

  const {
    custodiados: custodiadosBackend,
    loading: loadingBackend,
    error: errorBackend,
    refetch: refetchCustodiados
  } = useCustodiados();

  const [filtro, setFiltro] = useState('');
  const [colunaOrdenacao, setColunaOrdenacao] = useState<string>('nome');
  const [ordem, setOrdem] = useState<'asc' | 'desc'>('asc');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'em conformidade' | 'inadimplente'>('todos');
  const [filtroUrgencia, setFiltroUrgencia] = useState<'todos' | 'hoje' | 'atrasados' | 'proximos'>('todos');

  const [selecionado, setSelecionado] = useState<CustodiadoFormatado | null>(null);
  const [editando, setEditando] = useState<CustodiadoFormatado | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileExport, setShowMobileExport] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const dadosExtraidos = useMemo((): CustodiadoData[] => {
    if (loadingBackend || !custodiadosBackend) return [];

    const isApiResponse = (data: any): data is { success: boolean; data: CustodiadoData[] } => {
      return data && typeof data === 'object' && 'success' in data && 'data' in data && Array.isArray(data.data);
    };

    if (isApiResponse(custodiadosBackend)) {
      return custodiadosBackend.success && Array.isArray(custodiadosBackend.data) ? custodiadosBackend.data : [];
    }
    if (Array.isArray(custodiadosBackend)) return custodiadosBackend;
    if (typeof custodiadosBackend === 'object') {
      for (const key of ['data', 'custodiados', 'items', 'results', 'content']) {
        if (key in custodiadosBackend && Array.isArray((custodiadosBackend as any)[key])) {
          return (custodiadosBackend as any)[key];
        }
      }
    }
    return [];
  }, [custodiadosBackend, loadingBackend]);

  const todosOsDados = useMemo((): CustodiadoFormatado[] => {
    if (dadosExtraidos.length === 0) return [];

    const transformarCustodiado = (custodiado: CustodiadoData): CustodiadoFormatado => {
      const ensureString = (value: string | undefined | null): string => value || '';
      const processarProximoComparecimento = (valor: string | Date | undefined): string => {
        if (!valor) return '';
        if (typeof valor === 'string') return valor;
        if (valor instanceof Date) return valor.toISOString().split('T')[0];
        return '';
      };

      // id = UUID string (from backend CustodiadoListDTO.id = publicId.toString())
      const rawId = (custodiado as any).id;
      const id: string = rawId !== undefined && rawId !== null ? String(rawId) : '';

      // numericId = Long (from backend CustodiadoListDTO.numericId)
      const rawNumericId = (custodiado as any).numericId;
      const numericId: number = typeof rawNumericId === 'number'
        ? rawNumericId
        : (parseInt(String(rawNumericId)) || 0);

      return {
        id,
        numericId,
        nome: custodiado.nome,
        cpf: custodiado.cpf || '',
        rg: custodiado.rg || '',
        contato: custodiado.contato,
        processo: custodiado.processo,
        vara: custodiado.vara,
        comarca: custodiado.comarca,
        decisao: custodiado.dataDecisao,
        periodicidade: custodiado.periodicidade,
        status: custodiado.status === 'EM_CONFORMIDADE' ? 'em conformidade' : 'inadimplente',
        primeiroComparecimento: ensureString(custodiado.dataComparecimentoInicial),
        dataComparecimentoInicial: ensureString(custodiado.dataComparecimentoInicial),
        ultimoComparecimento: ensureString(custodiado.ultimoComparecimento),
        proximoComparecimento: processarProximoComparecimento(custodiado.proximoComparecimento),
        urgente: (custodiado as any).urgente || false,
        diasAtraso: (custodiado as any).diasAtraso || 0,
        comparecimentoHoje: (custodiado as any).comparecimentoHoje || false,
        endereco: custodiado.endereco ? {
          cep: custodiado.endereco.cep,
          logradouro: custodiado.endereco.logradouro,
          numero: custodiado.endereco.numero,
          complemento: custodiado.endereco.complemento,
          bairro: custodiado.endereco.bairro,
          cidade: custodiado.endereco.cidade,
          estado: custodiado.endereco.estado
        } : undefined,
        observacoes: custodiado.observacoes,
        enderecoCompleto: custodiado.endereco
          ? `${custodiado.endereco.logradouro}${custodiado.endereco.numero ? ', ' + custodiado.endereco.numero : ''}, ${custodiado.endereco.bairro} - ${custodiado.endereco.cidade}/${custodiado.endereco.estado}`
          : undefined,
        cidadeEstado: custodiado.endereco
          ? `${custodiado.endereco.cidade}/${custodiado.endereco.estado}`
          : undefined
      };
    };

    return dadosExtraidos.map(transformarCustodiado);
  }, [dadosExtraidos]);

  const handleVerDetalhes = (item: CustodiadoFormatado) => {
    router.push(`/dashboard/custodiados/${item.id}`);
  };

  useEffect(() => {
    const busca = searchParams.get('busca');
    const status = searchParams.get('status') as 'todos' | 'em conformidade' | 'inadimplente' | null;
    const urgencia = searchParams.get('urgencia') as 'todos' | 'hoje' | 'atrasados' | 'proximos' | null;
    const dataI = searchParams.get('dataInicio');
    const dataF = searchParams.get('dataFim');

    if (busca) setFiltro(busca);
    if (status) setFiltroStatus(status);
    if (urgencia) setFiltroUrgencia(urgencia);
    if (dataI) setDataInicio(dataI);
    if (dataF) setDataFim(dataF);
  }, [searchParams]);

  useEffect(() => {
    const updated = searchParams.get('updated');
    const needsRefetch = typeof window !== 'undefined' ? sessionStorage.getItem('needsRefetch') : null;

    if (updated || needsRefetch === 'true') {
      showToast({ type: 'success', title: 'Lista Atualizada', message: 'Dados atualizados com sucesso', duration: 3000 });
      refetchCustodiados();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('needsRefetch');
        sessionStorage.removeItem('lastUpdate');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [searchParams, showToast, refetchCustodiados]);

  useEffect(() => {
    const handler = () => refetchCustodiados();
    window.addEventListener('comparecimento-registrado', handler);
    return () => window.removeEventListener('comparecimento-registrado', handler);
  }, [refetchCustodiados]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtro) params.set('busca', filtro);
    if (filtroStatus !== 'todos') params.set('status', filtroStatus);
    if (filtroUrgencia !== 'todos') params.set('urgencia', filtroUrgencia);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    setCurrentPage(1);
  }, [filtro, filtroStatus, filtroUrgencia, dataInicio, dataFim]);

  const handleRefresh = async () => {
    await refetchCustodiados();
    showToast({ type: 'success', title: 'Dados atualizados', message: 'Lista atualizada com sucesso.', duration: 3000 });
  };

  const normalizarTexto = useCallback((texto: string) => {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }, []);

  const isToday = (ds: string): boolean => {
    if (!ds) return false;
    const hoje = new Date();
    const d = new Date(ds);
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  };
  const isOverdue = (ds: string): boolean => {
    if (!ds) return false;
    const h = new Date(); h.setHours(0, 0, 0, 0);
    const d = new Date(ds); d.setHours(0, 0, 0, 0);
    return d < h;
  };
  const getDaysUntil = (ds: string): number => {
    if (!ds) return 0;
    const h = new Date(); h.setHours(0, 0, 0, 0);
    const d = new Date(ds); d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - h.getTime()) / 86400000);
  };

  const filtrarDados = useCallback((data: CustodiadoFormatado[]): CustodiadoFormatado[] => {
    return data.filter((item) => {
      const termo = filtro.trim();
      let matchTexto = true;
      if (termo.length > 0) {
        const tn = normalizarTexto(termo);
        matchTexto = normalizarTexto(item.nome).includes(tn) || normalizarTexto(item.processo).includes(tn) || normalizarTexto(item.cpf).includes(tn);
      }
      const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
      const matchUrgencia = (() => {
        if (filtroUrgencia === 'todos') return true;
        if (filtroUrgencia === 'hoje') return isToday(item.proximoComparecimento);
        if (filtroUrgencia === 'atrasados') return isOverdue(item.proximoComparecimento);
        if (filtroUrgencia === 'proximos') { const d = getDaysUntil(item.proximoComparecimento); return d >= 0 && d <= 7 && !isToday(item.proximoComparecimento); }
        return true;
      })();
      const dentroPeriodo = (!dataInicio || !dataFim) || (new Date(item.proximoComparecimento) >= new Date(dataInicio) && new Date(item.proximoComparecimento) <= new Date(dataFim));
      return matchTexto && matchStatus && matchUrgencia && dentroPeriodo;
    });
  }, [filtro, filtroStatus, filtroUrgencia, dataInicio, dataFim, normalizarTexto]);

  const ordenarDados = useCallback((data: CustodiadoFormatado[]): CustodiadoFormatado[] => {
    return [...data].sort((a, b) => {
      let aV: any, bV: any;
      switch (colunaOrdenacao) {
        case 'nome': aV = a.nome; bV = b.nome; break;
        case 'status': aV = a.status; bV = b.status; break;
        case 'proximoComparecimento': aV = new Date(a.proximoComparecimento || '9999-12-31').getTime(); bV = new Date(b.proximoComparecimento || '9999-12-31').getTime(); break;
        case 'ultimoComparecimento': aV = new Date(a.ultimoComparecimento || '1900-01-01').getTime(); bV = new Date(b.ultimoComparecimento || '1900-01-01').getTime(); break;
        default: return 0;
      }
      if (aV < bV) return ordem === 'asc' ? -1 : 1;
      if (aV > bV) return ordem === 'asc' ? 1 : -1;
      return 0;
    });
  }, [colunaOrdenacao, ordem]);

  const dadosFiltrados = useMemo(() => ordenarDados(filtrarDados(todosOsDados)), [todosOsDados, filtrarDados, ordenarDados]);

  const totalHoje = useMemo(() => todosOsDados.filter(i => isToday(i.proximoComparecimento)).length, [todosOsDados]);
  const totalAtrasados = useMemo(() => todosOsDados.filter(i => isOverdue(i.proximoComparecimento)).length, [todosOsDados]);
  const totalProximos = useMemo(() => todosOsDados.filter(i => { const d = getDaysUntil(i.proximoComparecimento); return d >= 0 && d <= 7 && !isToday(i.proximoComparecimento); }).length, [todosOsDados]);

  const totalFiltrados = dadosFiltrados.length;
  const totalPages = Math.ceil(totalFiltrados / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const dadosPaginados = dadosFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => { setCurrentPage(page); containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const handleOrdenacao = (coluna: string) => { if (colunaOrdenacao === coluna) setOrdem(ordem === 'asc' ? 'desc' : 'asc'); else { setColunaOrdenacao(coluna); setOrdem('asc'); } };
  const limparFiltros = () => { setFiltro(''); setDataInicio(''); setDataFim(''); setFiltroStatus('todos'); setFiltroUrgencia('todos'); setCurrentPage(1); };
  const hasActiveFilters = filtro || dataInicio || dataFim || filtroStatus !== 'todos' || filtroUrgencia !== 'todos';
  const filterInfo = { filtro: filtro || undefined, status: filtroStatus !== 'todos' ? filtroStatus : undefined, urgencia: filtroUrgencia !== 'todos' ? filtroUrgencia : undefined, dataInicio: dataInicio || undefined, dataFim: dataFim || undefined };

  if (loadingBackend) {
    return (<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div><p className="text-lg text-gray-600">Carregando custodiados...</p></div></div>);
  }
  if (errorBackend) {
    return (<div className="min-h-screen flex items-center justify-center p-4"><div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md"><h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3><p className="text-red-600 mb-4">{errorBackend}</p><button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Recarregar</button></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50" ref={containerRef}>
      {isMobile ? (
        /* ══════ MOBILE ══════ */
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-800">Custodiados</h1>
              <div className="flex gap-2">
                <button onClick={() => setShowFilters(!showFilters)} className="p-2 bg-primary text-white rounded-lg"><SlidersHorizontal className="w-5 h-5" /></button>
                <button onClick={() => setShowMobileExport(!showMobileExport)} className="p-2 bg-green-600 text-white rounded-lg"><Download className="w-5 h-5" /></button>
                <button onClick={handleRefresh} className="p-2 bg-gray-600 text-white rounded-lg"><RefreshCw className="w-5 h-5" /></button>
              </div>
            </div>

            {showMobileExport && <div className="mb-4 p-3 bg-gray-50 rounded-lg"><ExportButton dados={todosOsDados} dadosFiltrados={dadosFiltrados} filterInfo={filterInfo} /></div>}

            {showFilters && (
              <div className="space-y-3 mb-4">
                <div className="relative"><Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="text" placeholder="Nome, CPF ou processo..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}><option value="todos">Todos os Status</option><option value="em conformidade">Em Conformidade</option><option value="inadimplente">Inadimplente</option></select>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={filtroUrgencia} onChange={(e) => setFiltroUrgencia(e.target.value as any)}><option value="todos">Todas</option><option value="hoje">Hoje ({totalHoje})</option><option value="atrasados">Atrasados ({totalAtrasados})</option><option value="proximos">Próximos 7d ({totalProximos})</option></select>
                {hasActiveFilters && <button onClick={limparFiltros} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2"><X className="w-4 h-4" />Limpar</button>}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-600"><span>Total: {todosOsDados.length}</span><span>Filtrados: {totalFiltrados}</span></div>
          </div>

          <div className="space-y-3">
            {dadosPaginados.map((item, index) => {
              const hoje = isToday(item.proximoComparecimento);
              const atrasado = isOverdue(item.proximoComparecimento);
              const diasRestantes = getDaysUntil(item.proximoComparecimento);
              const urgente = item.urgente || false;

              return (
                <div key={item.id || index} className={`bg-white rounded-lg shadow-sm p-4 ${urgente ? 'border-l-4 border-red-500' : atrasado ? 'border-l-4 border-orange-500' : hoje ? 'border-l-4 border-yellow-500' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <User className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-800 truncate">{item.nome}</h3><p className="text-xs text-gray-600">{item.cpf}</p></div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${item.status === 'inadimplente' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{item.status === 'inadimplente' ? 'Inadimplente' : 'Conforme'}</span>
                  </div>
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-600"><FileText className="w-4 h-4 flex-shrink-0" /><span className="truncate">{item.processo}</span></div>
                    {item.enderecoCompleto && <div className="flex items-start gap-2 text-gray-600"><MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /><span className="line-clamp-2 text-xs">{item.enderecoCompleto}</span></div>}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p className={`text-xs ${urgente ? 'text-red-600 font-bold' : atrasado ? 'text-orange-600 font-medium' : hoje ? 'text-yellow-600 font-medium' : ''}`}>Próximo: {item.proximoComparecimento ? formatToBrazilianDate(item.proximoComparecimento) : '-'}</p>
                        {(urgente || atrasado || hoje || (diasRestantes > 0 && diasRestantes <= 7)) && <p className="text-xs text-gray-500">{urgente ? `URGENTE - ${Math.abs(diasRestantes)}d atraso` : atrasado ? `${Math.abs(diasRestantes)}d atraso` : hoje ? 'Hoje' : `${diasRestantes}d`}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {urgente && <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex-1 font-bold"><AlertTriangle className="w-3 h-3" />URGENTE</span>}
                    {!urgente && atrasado && <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs flex-1"><AlertTriangle className="w-3 h-3" />Atrasado</span>}
                    {!urgente && !atrasado && hoje && <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-1"><Clock className="w-3 h-3" />Hoje</span>}
                    <button onClick={() => handleVerDetalhes(item)} className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark">Ver Detalhes</button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      ) : (
        /* ══════ DESKTOP ══════ */
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h1 className="text-3xl font-bold text-gray-800 mb-2">Gerenciamento de Custodiados</h1><p className="text-gray-600">Visualize, filtre e gerencie todos os custodiados</p></div>
              <div className="flex gap-3">
                <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"><RefreshCw className="w-5 h-5" />Atualizar</button>
                <ExportButton dados={todosOsDados} dadosFiltrados={dadosFiltrados} filterInfo={filterInfo} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label><div className="relative"><Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="text" placeholder="Nome, CPF ou processo..." className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select className="w-full px-3 py-2 border border-border rounded-lg" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}><option value="todos">Todos</option><option value="em conformidade">Em Conformidade</option><option value="inadimplente">Inadimplente</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Urgência</label><select className="w-full px-3 py-2 border border-border rounded-lg" value={filtroUrgencia} onChange={(e) => setFiltroUrgencia(e.target.value as any)}><option value="todos">Todos</option><option value="hoje">Hoje ({totalHoje})</option><option value="atrasados">Atrasados ({totalAtrasados})</option><option value="proximos">Próximos 7d ({totalProximos})</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label><input type="date" className="w-full px-3 py-2 border border-border rounded-lg" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label><input type="date" className="w-full px-3 py-2 border border-border rounded-lg" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
              {hasActiveFilters && <div className="flex items-end"><button onClick={limparFiltros} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-2"><X className="w-4 h-4" />Limpar</button></div>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Resultados ({totalFiltrados} de {todosOsDados.length}){totalFiltrados > 0 && <span className="text-sm text-gray-600 ml-2">• Página {currentPage} de {totalPages}</span>}</h3>
                {hasActiveFilters && <span className="text-sm text-gray-600 flex items-center gap-1"><SlidersHorizontal className="w-4 h-4" />Filtros ativos</span>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="p-3 text-left cursor-pointer hover:bg-primary-dark" onClick={() => handleOrdenacao('nome')}>Nome / CPF {colunaOrdenacao === 'nome' && (ordem === 'asc' ? '↑' : '↓')}</th>
                    <th className="p-3 text-left">Processo / Vara</th>
                    <th className="p-3 text-center cursor-pointer hover:bg-primary-dark" onClick={() => handleOrdenacao('status')}>Status {colunaOrdenacao === 'status' && (ordem === 'asc' ? '↑' : '↓')}</th>
                    <th className="p-3 text-center cursor-pointer hover:bg-primary-dark" onClick={() => handleOrdenacao('ultimoComparecimento')}>Último {colunaOrdenacao === 'ultimoComparecimento' && (ordem === 'asc' ? '↑' : '↓')}</th>
                    <th className="p-3 text-center cursor-pointer hover:bg-primary-dark" onClick={() => handleOrdenacao('proximoComparecimento')}>Próximo {colunaOrdenacao === 'proximoComparecimento' && (ordem === 'asc' ? '↑' : '↓')}</th>
                    <th className="p-3 text-center">Urgência</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPaginados.map((item, index) => {
                    const hoje = item.comparecimentoHoje || isToday(item.proximoComparecimento);
                    const atrasado = item.atrasado || isOverdue(item.proximoComparecimento);
                    const diasRestantes = item.diasAtraso || getDaysUntil(item.proximoComparecimento);
                    const urgente = item.urgente || false;

                    return (
                      <tr key={item.id || index} className={`border-b border-border hover:bg-gray-50 cursor-pointer ${urgente ? 'bg-red-50' : atrasado ? 'bg-orange-50' : hoje ? 'bg-yellow-50' : ''}`} onClick={() => handleVerDetalhes(item)}>
                        <td className="p-3"><p className="font-medium text-text-base">{item.nome}</p><p className="text-sm text-text-muted">{item.cpf}</p></td>
                        <td className="p-3"><p className="text-sm font-mono text-text-muted">{item.processo}</p><p className="text-xs text-text-muted">{item.vara}</p></td>
                        <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'inadimplente' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{item.status === 'inadimplente' ? 'Inadimplente' : 'Em Conformidade'}</span></td>
                        <td className="p-3 text-center text-sm">{item.ultimoComparecimento ? formatToBrazilianDate(item.ultimoComparecimento) : '-'}</td>
                        <td className="p-3 text-center">
                          <div className={`text-sm font-medium ${urgente ? 'text-red-600 font-bold' : atrasado ? 'text-orange-600' : hoje ? 'text-yellow-600' : 'text-text-base'}`}>{item.proximoComparecimento ? formatToBrazilianDate(item.proximoComparecimento) : '-'}</div>
                          <div className="text-xs text-text-muted">{urgente ? `URGENTE - ${Math.abs(diasRestantes)}d` : atrasado ? `${Math.abs(diasRestantes)}d atraso` : hoje ? 'Hoje' : diasRestantes > 0 ? `${diasRestantes}d` : 'Vencido'}</div>
                        </td>
                        <td className="p-3 text-center">
                          {urgente && <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold"><AlertTriangle className="w-3 h-3" />URGENTE</span>}
                          {!urgente && atrasado && <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs"><AlertTriangle className="w-3 h-3" />Atrasado</span>}
                          {!urgente && !atrasado && hoje && <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"><Clock className="w-3 h-3" />Hoje</span>}
                          {!urgente && !atrasado && !hoje && diasRestantes <= 7 && diasRestantes > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"><Clock className="w-3 h-3" />Próximo</span>}
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); handleVerDetalhes(item); }} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark">Visualizar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Mostrando {startIndex + 1} a {Math.min(endIndex, totalFiltrados)} de {totalFiltrados}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" />Anterior</button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pn; if (totalPages <= 5) pn = i + 1; else if (currentPage <= 3) pn = i + 1; else if (currentPage >= totalPages - 2) pn = totalPages - 4 + i; else pn = currentPage - 2 + i;
                        return <button key={pn} onClick={() => handlePageChange(pn)} className={`px-3 py-2 text-sm rounded-lg ${currentPage === pn ? 'bg-primary text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>{pn}</button>;
                      })}
                    </div>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Próxima<ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {dadosFiltrados.length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado</h3>
                <p className="text-gray-500 mb-4">Tente ajustar os filtros</p>
                <button onClick={limparFiltros} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">Limpar Filtros</button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">Dados carregados em {new Date().toLocaleTimeString('pt-BR')}</div>
        </div>
      )}

      {selecionado && (
        <DetalhesCustodiadoModal
          dados={selecionado as any}
          onClose={() => setSelecionado(null)}
          onEditar={(item) => { setSelecionado(null); setEditando(item as unknown as CustodiadoFormatado); }}
          onExcluir={async () => { setSelecionado(null); showToast({ type: 'success', title: 'Exclusão realizada', message: 'Registro excluído.', duration: 3000 }); await refetchCustodiados(); }}
        />
      )}

      {editando && (
        <EditarCustodiadoModal
          dados={editando as any}
          onClose={() => setEditando(null)}
          onVoltar={() => { setSelecionado(editando); setEditando(null); }}
          onSave={() => { handleRefresh(); setEditando(null); }}
        />
      )}
    </div>
  );
}

export default withSearchParams(GeralPage);
