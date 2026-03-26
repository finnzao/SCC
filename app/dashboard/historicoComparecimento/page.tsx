/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { comparecimentosService } from '@/lib/api/services';
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
  FileText,
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
  normalize(tipo: string): string {
    return tipo.toLowerCase();
  },
  format(tipo: string): string {
    const tipoNormalizado = tipo.toLowerCase();
    const formatacao: Record<string, string> = {
      'presencial': 'Presencial',
      'online': 'Online',
      'cadastro_inicial': 'Cadastro Inicial'
    };
    return formatacao[tipoNormalizado] || tipo;
  },
  isEqual(tipo1: string, tipo2: string): boolean {
    return tipo1.toLowerCase() === tipo2.toLowerCase();
  }
};

const dateUtils = {
  parseLocalDate: (dateString: string): Date => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  },
  formatarData: (data: string): string => {
    if (!data) return '';
    try {
      const dateObj = dateUtils.parseLocalDate(data);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return data;
    }
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
  const [colunaOrdenacao] = useState<string>('dataComparecimento');
  const [ordem] = useState<'asc' | 'desc'>('desc');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipoValidacao, setFiltroTipoValidacao] = useState<'todos' | string>('todos');
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

  const carregarHistoricos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await comparecimentosService.listarTodos({ page: 0, size: 1000 });
      if (response.success && response.data) {
        const historicosData = Array.isArray(response.data)
          ? response.data
          : response.data.comparecimentos || [];

        const historicosFormatados: HistoricoFormatado[] = historicosData.map((h: ComparecimentoResponse) => ({
          ...h,
          custodiadoNomeCompleto: h.custodiadoNome || 'Nome não informado',
          tipoValidacaoFormatado: TipoValidacaoUtils.format(h.tipoValidacao),
          dataFormatada: dateUtils.formatarData(h.dataComparecimento),
          horaFormatada: h.horaComparecimento || '00:00:00',
          numeroProcesso: (h as any).processoCustodiado || (h as any).numeroProcesso || ''
        }));

        setHistoricos(historicosFormatados);
      } else {
        throw new Error(response.message || 'Erro ao carregar históricos');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar históricos');
      showToast({ type: 'error', title: 'Erro ao carregar dados', message: err.message || 'Não foi possível carregar os históricos', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { carregarHistoricos(); }, [carregarHistoricos]);

  useEffect(() => {
    const busca = searchParams.get('busca');
    const tipo = searchParams.get('tipo');
    const dataI = searchParams.get('dataInicio');
    const dataF = searchParams.get('dataFim');
    if (busca) setFiltro(busca);
    if (tipo) setFiltroTipoValidacao(TipoValidacaoUtils.normalize(tipo));
    if (dataI) setDataInicio(dataI);
    if (dataF) setDataFim(dataF);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtro) params.set('busca', filtro);
    if (filtroTipoValidacao !== 'todos') params.set('tipo', filtroTipoValidacao);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);
    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    setCurrentPage(1);
  }, [filtro, filtroTipoValidacao, dataInicio, dataFim]);

  const normalizarTexto = useCallback((texto: string) => {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }, []);

  const filtrarDados = useCallback((data: HistoricoFormatado[]): HistoricoFormatado[] => {
    return data.filter((item) => {
      const termo = filtro.trim();
      let matchTexto = true;
      if (termo.length > 0) {
        const termoNormalizado = normalizarTexto(termo);
        const nomeNormalizado = normalizarTexto(item.custodiadoNomeCompleto || '');
        const validadorNormalizado = normalizarTexto(item.validadoPor || '');
        const processoNormalizado = normalizarTexto(item.numeroProcesso || '');
        matchTexto = nomeNormalizado.includes(termoNormalizado) ||
          validadorNormalizado.includes(termoNormalizado) ||
          processoNormalizado.includes(termoNormalizado);
      }
      const matchTipo = filtroTipoValidacao === 'todos' ||
        TipoValidacaoUtils.isEqual(item.tipoValidacao, filtroTipoValidacao);
      let matchData = true;
      if (dataInicio || dataFim) {
        const dataComparecimento = item.dataComparecimento;
        if (dataInicio && dataComparecimento < dataInicio) matchData = false;
        if (dataFim && dataComparecimento > dataFim) matchData = false;
      }
      return matchTexto && matchTipo && matchData;
    });
  }, [filtro, filtroTipoValidacao, dataInicio, dataFim, normalizarTexto]);

  const ordenarDados = useCallback((data: HistoricoFormatado[]): HistoricoFormatado[] => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      if (colunaOrdenacao === 'dataComparecimento') {
        comparison = a.dataComparecimento.localeCompare(b.dataComparecimento);
      } else if (colunaOrdenacao === 'custodiadoNome') {
        comparison = (a.custodiadoNomeCompleto || '').localeCompare(b.custodiadoNomeCompleto || '');
      }
      return ordem === 'asc' ? comparison : -comparison;
    });
  }, [colunaOrdenacao, ordem]);

  const dadosFiltrados = useMemo(
    () => ordenarDados(filtrarDados(historicos)),
    [historicos, filtrarDados, ordenarDados]
  );

  const totalFiltrados = dadosFiltrados.length;
  const totalPages = Math.ceil(totalFiltrados / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const dadosPaginados = dadosFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      if (containerRef.current) containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const limparFiltros = () => {
    setFiltro('');
    setFiltroTipoValidacao('todos');
    setDataInicio('');
    setDataFim('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filtro !== '' || filtroTipoValidacao !== 'todos' || dataInicio !== '' || dataFim !== '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-lg text-text-base">Carregando históricos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={carregarHistoricos} className="flex items-center gap-2 mx-auto bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
              <RefreshCw className="w-4 h-4" />Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalFiltrados)} de {totalFiltrados} resultados
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button key={pageNum} onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg ${currentPage === pageNum ? 'bg-primary text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Próxima<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Validação</label>
        <select className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          value={filtroTipoValidacao} onChange={(e) => setFiltroTipoValidacao(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
          <option value="cadastro_inicial">Cadastro Inicial</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
        <input type="date" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
        <input type="date" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
      </div>
      {hasActiveFilters && (
        <div className="flex items-end">
          <button onClick={limparFiltros} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center gap-2">
            <X className="w-4 h-4" />Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      {isMobile ? (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />Histórico
              </h1>
              <button onClick={carregarHistoricos} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors" title="Atualizar">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Buscar custodiado, validador ou processo..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasActiveFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <Filter className="w-4 h-4" />Filtros
                {hasActiveFilters && (<span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>)}
              </button>
              <button onClick={() => setShowMobileExport(!showMobileExport)}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-green-600 transition-colors font-medium">Exportar</button>
            </div>
          </div>

          {showMobileExport && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Exportar Dados</h3>
                <button onClick={() => setShowMobileExport(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <ExportButton dados={historicos} dadosFiltrados={dadosFiltrados} filterInfo={{ filtro, status: filtroTipoValidacao, dataInicio, dataFim }} exportType="historico" />
            </div>
          )}

          {showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Filter className="w-5 h-5" />Filtros</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              {renderFilters()}
            </div>
          )}

          <div className="space-y-3">
            {dadosPaginados.map((item, index) => (
              <div key={item.id || index} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{item.custodiadoNomeCompleto}</h3>
                    {item.numeroProcesso && (
                      <p className="text-xs text-gray-500 font-mono mb-1">{item.numeroProcesso}</p>
                    )}
                    <p className="text-sm text-gray-600">{item.validadoPor}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    TipoValidacaoUtils.isEqual(item.tipoValidacao, 'presencial') ? 'bg-green-100 text-green-800' :
                    TipoValidacaoUtils.isEqual(item.tipoValidacao, 'online') ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>{item.tipoValidacaoFormatado}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{item.dataFormatada}</span>
                  <span>{item.horaFormatada}</span>
                </div>
                {item.observacoes && (<p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.observacoes}</p>)}
                <div className="flex items-center gap-2">
                  {item.mudancaEndereco && (
                    <button onClick={() => router.push(`/dashboard/historicoComparecimento/enderecos/${item.custodiadoId}`)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200 transition-colors">
                      <MapPin className="w-3 h-3" />Mudança
                    </button>
                  )}
                  {item.anexos && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      <FileText className="w-3 h-3" />Anexos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />Anterior
                </button>
                <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Próxima<ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-center text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(endIndex, totalFiltrados)} de {totalFiltrados} registros
              </p>
            </div>
          )}

          {dadosFiltrados.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado encontrado</h3>
              <p className="text-gray-500 mb-4">Tente ajustar os filtros ou termos de busca</p>
              <button onClick={limparFiltros} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">Limpar Filtros</button>
            </div>
          )}

          <div className="text-center text-xs text-gray-500">
            Dados atualizados em: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-primary" />Histórico de Comparecimentos
              </h1>
              <p className="text-text-muted mt-1">Visualize e gerencie o histórico completo</p>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton dados={historicos} dadosFiltrados={dadosFiltrados}
                filterInfo={{ filtro, status: filtroTipoValidacao, dataInicio, dataFim }} exportType="historico" />
              <button onClick={carregarHistoricos}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium">
                <RefreshCw className="w-5 h-5" />Atualizar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Buscar por custodiado, validador ou nº do processo..."
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={filtro} onChange={(e) => setFiltro(e.target.value)} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${hasActiveFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <Filter className="w-5 h-5" />Filtros
                {hasActiveFilters && (<span className="ml-1 bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">!</span>)}
              </button>
            </div>
            {showFilters && renderFilters()}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Resultados ({totalFiltrados} {totalFiltrados === 1 ? 'registro' : 'registros'})
                  {totalFiltrados > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      • Página {currentPage} de {totalPages}
                    </span>
                  )}
                </h3>
                {hasActiveFilters && (
                  <span className="text-sm text-gray-600"><Filter className="w-4 h-4 inline mr-1" />Filtros ativos</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-auto">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="p-3 text-left">Custodiado</th>
                    <th className="p-3 text-left">Processo</th>
                    <th className="p-3 text-center">Data</th>
                    <th className="p-3 text-center">Hora</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-left">Validado Por</th>
                    <th className="p-3 text-left">Observações</th>
                    <th className="p-3 text-center">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPaginados.map((item, index) => (
                    <tr key={item.id || index} className="border-b border-border hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-text-base">{item.custodiadoNomeCompleto}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-mono text-gray-600">{item.numeroProcesso || '—'}</p>
                      </td>
                      <td className="p-3 text-center text-sm">{item.dataFormatada}</td>
                      <td className="p-3 text-center text-sm">{item.horaFormatada}</td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          TipoValidacaoUtils.isEqual(item.tipoValidacao, 'presencial') ? 'bg-green-100 text-green-800' :
                          TipoValidacaoUtils.isEqual(item.tipoValidacao, 'online') ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>{item.tipoValidacaoFormatado}</span>
                      </td>
                      <td className="p-3 text-sm">{item.validadoPor}</td>
                      <td className="p-3 text-sm">
                        {item.observacoes ? (<span className="line-clamp-2">{item.observacoes}</span>) : (<span className="text-gray-400">-</span>)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.mudancaEndereco && (
                            <button onClick={() => router.push(`/dashboard/historicoComparecimento/enderecos/${item.custodiadoId}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200 transition-colors" title="Ver histórico de endereços">
                              <MapPin className="w-3 h-3" />Mudança
                            </button>
                          )}
                          {item.anexos && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              <FileText className="w-3 h-3" />Anexos
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderPagination()}

            {dadosFiltrados.length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 mb-4">Tente ajustar os filtros ou termos de busca</p>
                <button onClick={limparFiltros} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">Limpar Filtros</button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            Dados atualizados em: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      )}
    </div>
  );
}

export default withSearchParams(HistoricoPage);
