'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, ChevronRight, Loader2, Filter, X, Calendar } from 'lucide-react';
import type { CustodiadoData } from '@/types/api';
import { StatusFiltro } from '@/constants/status';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import { useCustodiados } from '@/hooks/useAPI';

export default function BuscarPage() {
  const router = useRouter();
  const { custodiados, loading: loadingCustodiados } = useCustodiados();

  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<CustodiadoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');
  const [hasSearched, setHasSearched] = useState(false);

  const normalizarTexto = useCallback((texto: string): string => {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }, []);

  const isEmConformidade = (status: string | undefined): boolean => {
    if (!status) return false;
    const s = String(status).toUpperCase();
    return s === 'EM_CONFORMIDADE' || s === 'EM CONFORMIDADE';
  };

  const isInadimplente = (status: string | undefined): boolean => {
    if (!status) return false;
    const s = String(status).toUpperCase();
    return s === 'INADIMPLENTE';
  };

  const handleBusca = () => {
    if (!busca.trim()) return;

    if (!custodiados || custodiados.length === 0) {
      setHasSearched(true);
      setResultados([]);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    setTimeout(() => {
      const termo = normalizarTexto(busca);

      let resultadosFiltrados = custodiados.filter(item => {
        const nomeNorm = normalizarTexto(item.nome || '');
        const processoNorm = normalizarTexto(item.processo || '');
        const cpfNorm = normalizarTexto(item.cpf || '');
        return nomeNorm.includes(termo) ||
          processoNorm.includes(termo) ||
          cpfNorm.includes(termo);
      });

      if (filtroStatus !== 'todos') {
        resultadosFiltrados = resultadosFiltrados.filter(item => {
          const statusStr = item.status ? String(item.status) : '';
          if (filtroStatus === 'EM_CONFORMIDADE') {
            return isEmConformidade(statusStr);
          }
          return isInadimplente(statusStr);
        });
      }

      setResultados(resultadosFiltrados);
      setLoading(false);
    }, 300);
  };

  const handleConfirmarPresenca = (processo: string) => {
    router.push(`/dashboard/comparecimento/confirmar?processo=${encodeURIComponent(processo)}`);
  };

  const limparBusca = () => {
    setBusca('');
    setResultados([]);
    setFiltroStatus('todos');
    setHasSearched(false);
  };

  const getStatusColor = (status: string | undefined) => {
    return isEmConformidade(status)
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getStatusLabel = (status: string | undefined) => {
    return isEmConformidade(status) ? 'Em Conformidade' : 'Inadimplente';
  };

  const getUrgencyInfo = (data: string | undefined) => {
    if (!data) return null;

    const hoje = new Date().toDateString();
    const comparecimento = new Date(data).toDateString();
    const diasRestantes = Math.ceil((new Date(data).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (comparecimento === hoje) {
      return { label: 'HOJE', color: 'bg-yellow-500 text-white', urgent: true };
    } else if (diasRestantes < 0) {
      return { label: `${Math.abs(diasRestantes)}d atraso`, color: 'bg-red-500 text-white', urgent: true };
    } else if (diasRestantes <= 7) {
      return { label: `${diasRestantes}d`, color: 'bg-blue-500 text-white', urgent: false };
    }
    return null;
  };

  if (loadingCustodiados) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile */}
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="p-4">
          <h1 className="text-xl font-bold text-primary-dark mb-2">
            Buscar Pessoa
          </h1>

          {/* Barra de Busca */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBusca()}
                placeholder="Nome, CPF ou processo..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              />
              {busca && (
                <button
                  onClick={limparBusca}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-colors ${showFilters || filtroStatus !== 'todos'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300'
                }`}
            >
              <Filter className="w-5 h-5" />
            </button>

            <button
              onClick={handleBusca}
              disabled={loading || !busca.trim()}
              className="bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg animate-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFiltroStatus('todos')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtroStatus === 'todos'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 border border-gray-300'
                    }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroStatus('EM_CONFORMIDADE')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtroStatus === 'EM_CONFORMIDADE'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-300'
                    }`}
                >
                  Conformidade
                </button>
                <button
                  onClick={() => setFiltroStatus('INADIMPLENTE')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${filtroStatus === 'INADIMPLENTE'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-300'
                    }`}
                >
                  Inadimplente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        {hasSearched && (
          <div className="px-4 pb-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
            </span>
            {resultados.length > 0 && (
              <button
                onClick={limparBusca}
                className="text-primary hover:text-primary-dark"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 pb-20">
        {/* Resultados Mobile */}
        {resultados.length > 0 && (
          <div className="space-y-3">
            {resultados.map((pessoa, index) => {
              const proximoComp = typeof pessoa.proximoComparecimento === 'string'
                ? pessoa.proximoComparecimento
                : pessoa.proximoComparecimento instanceof Date
                  ? pessoa.proximoComparecimento.toISOString().split('T')[0]
                  : undefined;
              const urgencyInfo = proximoComp ? getUrgencyInfo(proximoComp) : null;

              return (
                <div
                  key={pessoa.id || index}
                  className="bg-white rounded-xl shadow-sm overflow-hidden touch-feedback"
                >
                  {/* Header do Card */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 text-sm">{pessoa.nome}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">CPF: {pessoa.cpf || 'Não informado'}</p>
                        </div>
                      </div>
                      {urgencyInfo && (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${urgencyInfo.color}`}>
                          {urgencyInfo.label}
                        </span>
                      )}
                    </div>

                    {/* Informações do Card */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Processo: {pessoa.processo}</span>
                      </div>

                      {proximoComp && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Próximo: {formatToBrazilianDate(proximoComp)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pessoa.status ? String(pessoa.status) : undefined)}`}>
                          {getStatusLabel(pessoa.status ? String(pessoa.status) : undefined)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => handleConfirmarPresenca(pessoa.processo)}
                    className={`w-full p-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${urgencyInfo?.urgent
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-t'
                      }`}
                  >
                    Confirmar Comparecimento
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Estado Inicial - Mobile */}
        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Busque por uma pessoa</h3>
            <p className="text-gray-500 text-center text-sm px-8">
              Digite o nome, CPF ou número do processo para encontrar rapidamente
            </p>

            {/* Dicas de busca */}
            <div className="mt-8 w-full max-w-sm">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Dicas de busca:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary">•</span>
                  <span>Digite pelo menos 3 caracteres do nome</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary">•</span>
                  <span>CPF pode ser digitado com ou sem pontos</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary">•</span>
                  <span>Use o filtro para refinar os resultados</span>
                </div>
              </div>
            </div>

            {(!custodiados || custodiados.length === 0) && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm">
                <p className="text-sm text-yellow-700 text-center">
                  Nenhum custodiado cadastrado no sistema. Cadastre uma pessoa primeiro.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-gray-600">Buscando...</p>
          </div>
        )}

        {/* Estado Vazio */}
        {hasSearched && !loading && resultados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-500 text-center text-sm px-8 mb-6">
              Não encontramos ninguém com &quot;{busca}&quot;
            </p>
            <button
              onClick={limparBusca}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Nova busca
            </button>
          </div>
        )}
      </div>

      {/* Ações Rápidas Fixas - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/dashboard/geral')}
            className="bg-gray-100 text-gray-700 py-3 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Ver Lista Geral
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-primary text-white py-3 rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
