'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, ChevronRight, X, Calendar, AlertCircle } from 'lucide-react';
import { useBuscaInteligente } from '@/hooks/useBuscaInteligente';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import type { ResultadoBusca } from '@/hooks/useBuscaInteligente';

/**
 * ID RULES:
 * - For navigation to /custodiados/{id}: use UUID (custodiado.id)
 * - For confirmar comparecimento: use processoId (Long)
 *
 * The search endpoint returns custodiadoId as numericId.
 * We need to find the UUID for navigation. Since we may not have it from search results,
 * we pass numericId to the detail page which will handle the lookup.
 *
 * NOTE: If the backend search returns a UUID field, use that instead.
 */

function HintBusca({ tipo, termo }: { tipo: string; termo: string }) {
  if (tipo === 'vazio') return null;

  if (tipo === 'nome' && termo.length < 3) {
    const restante = 3 - termo.length;
    return (<p className="text-sm text-gray-500 mt-2">Digite mais {restante} letra{restante > 1 ? 's' : ''}</p>);
  }

  if (tipo === 'nome' && termo.length >= 3) {
    return (<p className="text-sm text-blue-600 mt-2">Buscando por nome...</p>);
  }

  if (tipo === 'incompleto') {
    const digitos = termo.replace(/\D/g, '').length;
    return (<p className="text-sm text-gray-500 mt-2">CPF: {digitos}/11 dígitos | Processo: {digitos}/20 dígitos</p>);
  }

  if (tipo === 'cpf') return (<p className="text-sm text-green-600 mt-2">CPF completo detectado</p>);
  if (tipo === 'processo') return (<p className="text-sm text-green-600 mt-2">Número de processo completo detectado</p>);

  return null;
}

export default function BuscarPage() {
  const router = useRouter();
  const [termoBusca, setTermoBusca] = useState('');

  const { resultados, loading, error, tipoDetectado, totalResultados, limpar } = useBuscaInteligente(termoBusca);

  const termoValido = (tipoDetectado === 'nome' && termoBusca.trim().length >= 3) ||
    tipoDetectado === 'cpf' ||
    tipoDetectado === 'processo';

  // Navigate to custodiado detail
  // The search results have custodiadoId (numericId) but we need UUID for /custodiados/{uuid}
  // For now, pass the custodiadoId - the detail page will handle looking up via the list endpoint
  const handleVerPerfil = (custodiadoId: number) => {
    // TODO: If search results include custodiadoUuid, use that instead
    router.push(`/dashboard/custodiados/${custodiadoId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="p-4 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-primary-dark mb-3">Buscar Pessoa</h1>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Nome, CPF ou número do processo..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {termoBusca && (
              <button onClick={() => { setTermoBusca(''); limpar(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <HintBusca tipo={tipoDetectado} termo={termoBusca} />

          {totalResultados > 0 && (
            <p className="text-sm text-gray-600 mt-2">{totalResultados} resultado{totalResultados !== 1 ? 's' : ''} encontrado{totalResultados !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="p-4 pb-20 max-w-3xl mx-auto">
        {!termoBusca && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Busque por uma pessoa</h3>
            <p className="text-gray-500 text-center text-sm px-8">Digite o nome, CPF ou número do processo</p>

            <div className="mt-8 w-full max-w-sm">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Dicas de busca:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-600"><span className="text-primary">•</span><span>Digite pelo menos 3 caracteres do nome</span></div>
                <div className="flex items-start gap-2 text-sm text-gray-600"><span className="text-primary">•</span><span>CPF com 11 dígitos busca automaticamente</span></div>
                <div className="flex items-start gap-2 text-sm text-gray-600"><span className="text-primary">•</span><span>Processo com 20 dígitos busca automaticamente</span></div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-4 mt-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
                      <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-4 w-full bg-gray-100 animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-gray-100 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Erro na busca</h3>
            <p className="text-gray-500 text-center text-sm px-8">{error}</p>
          </div>
        )}

        {!loading && !error && termoValido && resultados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-500 text-center text-sm px-8 mb-6">Não encontramos ninguém com &quot;{termoBusca}&quot;</p>
            <button onClick={() => { setTermoBusca(''); limpar(); }} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark">Nova busca</button>
          </div>
        )}

        {!loading && resultados.length > 0 && (
          <div className="space-y-4 mt-4">
            {resultados.map((resultado: ResultadoBusca) => (
              <div key={resultado.custodiadoId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{resultado.custodiadoNome}</h3>
                        <p className="text-xs text-gray-500">CPF: {resultado.custodiadoCpf}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVerPerfil(resultado.custodiadoId)}
                      className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                    >
                      Ver Perfil <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {resultado.processos.map(processo => (
                    <div key={processo.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-mono text-gray-700 truncate">{processo.numeroProcesso}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{processo.vara}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${processo.status === 'EM_CONFORMIDADE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {processo.status === 'EM_CONFORMIDADE' ? 'Conforme' : 'Inadimplente'}
                          </span>
                        </div>
                        {processo.proximoComparecimento && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>Próximo: {formatToBrazilianDate(processo.proximoComparecimento)}</span>
                          </div>
                        )}
                      </div>
                      {processo.situacaoProcesso === 'ATIVO' && (
                        <button
                          onClick={() => router.push(`/dashboard/comparecimento/confirmar?processoId=${processo.id}`)}
                          className="ml-3 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors flex-shrink-0"
                        >
                          Confirmar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/dashboard/geral')} className="bg-gray-100 text-gray-700 py-3 rounded-lg font-medium text-sm hover:bg-gray-200">Ver Lista Geral</button>
          <button onClick={() => router.push('/dashboard')} className="bg-primary text-white py-3 rounded-lg font-medium text-sm hover:bg-primary-dark">Voltar ao Início</button>
        </div>
      </div>
    </div>
  );
}
