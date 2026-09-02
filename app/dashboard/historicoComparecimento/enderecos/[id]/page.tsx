'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHistoricoEndereco } from '@/hooks/useHistoricoEndereco';
import { custodiadosService } from '@/lib/api/services';
import type { PessoaMonitoradaData } from '@/types/api';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  User,
  FileText,
  Home,
  CheckCircle,
  AlertCircle,
  MapPinned
} from 'lucide-react';
import { Suspense } from 'react';

function HistoricoEnderecosContent() {
  const params = useParams();
  const router = useRouter();
  const custodiadoId = parseInt(params.id as string);

  const { historico, loading, error, buscarHistorico, enderecoAtual, totalEnderecos } = useHistoricoEndereco();
  const [custodiado, setCustodiado] = useState<PessoaMonitoradaData | null>(null);
  const [loadingPessoaMonitorada, setLoadingPessoaMonitorada] = useState(true);

  const carregarDados = useCallback(async () => {
    try {
      setLoadingPessoaMonitorada(true);

      const response = await custodiadosService.buscarPorId(custodiadoId);

      if (response && response.data) {
        setCustodiado(response.data);
      }

      await buscarHistorico(custodiadoId);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoadingPessoaMonitorada(false);
    }
  }, [custodiadoId, buscarHistorico]);

  useEffect(() => {
    if (custodiadoId) {
      carregarDados();
    }
  }, [custodiadoId, carregarDados]);

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatarDataCurta = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading || loadingPessoaMonitorada) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Carregando histórico...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar histórico</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={carregarDados}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Fixo */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPinned className="w-7 h-7 text-primary" />
                Histórico de Endereços
              </h1>
              {custodiado && (
                <div className="space-y-1.5 text-sm sm:text-base">
                  <p className="text-gray-700">
                    <span className="font-semibold">Nome:</span> {custodiado.nome}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Processo:</span> {custodiado.processo}
                  </p>
                  {custodiado.cpf && (
                    <p className="text-gray-700">
                      <span className="font-semibold">CPF:</span> {custodiado.cpf}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                <Home className="w-5 h-5" />
                <span>{totalEnderecos} {totalEnderecos === 1 ? 'endereço' : 'endereços'}</span>
              </div>

              {enderecoAtual && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Endereço atual ativo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {historico.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MapPin className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhum endereço registrado
            </h3>
            <p className="text-gray-500 mb-6">
              Ainda não há histórico de endereços para este custodiado.
            </p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Voltar ao Histórico
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Timeline */}
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-gray-300 to-gray-200"></div>

              {/* Items da Timeline */}
              <div className="space-y-8">
                {historico.map((item, index) => (
                  <div key={item.id} className="relative pl-20">
                    {/* Círculo indicador */}
                    <div className={`absolute left-5 w-7 h-7 rounded-full border-4 flex items-center justify-center ${item.enderecoAtivo
                        ? 'bg-green-500 border-green-200 shadow-lg shadow-green-200'
                        : 'bg-gray-400 border-gray-200'
                      }`}>
                      {item.enderecoAtivo && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>

                    {/* Card do Endereço */}
                    <div className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${item.enderecoAtivo
                        ? 'border-green-300 ring-2 ring-green-100'
                        : 'border-gray-200'
                      }`}>
                      {/* Header do Card */}
                      <div className={`px-6 py-4 border-b ${item.enderecoAtivo
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'
                          : 'bg-gray-50 border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            {item.enderecoAtivo ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <div>
                                  <h3 className="font-bold text-green-900 text-lg">
                                    Endereço Atual
                                  </h3>
                                  <p className="text-sm text-green-700 font-medium">
                                    {item.periodoResidencia}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-500" />
                                <div>
                                  <h3 className="font-semibold text-gray-700">
                                    Endereço Anterior #{historico.length - index}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {item.periodoResidencia}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {item.enderecoAtivo && (
                            <span className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-full shadow-sm">
                              Ativo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Corpo do Card */}
                      <div className="p-6 space-y-5">
                        {/* Endereço Completo */}
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <p className="text-gray-900 font-semibold text-lg mb-2">
                              {item.enderecoCompleto}
                            </p>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                CEP: {item.cep}
                              </span>
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                {item.nomeEstado} - {item.regiaoEstado}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Informações de Período */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                          <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Data de Início</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatarDataCurta(item.dataInicio)}
                              </p>
                            </div>
                          </div>

                          {item.dataFim ? (
                            <div className="flex items-start gap-3">
                              <Calendar className="w-5 h-5 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Data de Término</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatarDataCurta(item.dataFim)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Tempo de Residência</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.diasResidencia} dias
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Motivo da Alteração */}
                        {item.motivoAlteracao && (
                          <div className="flex items-start gap-3 pt-4 border-t border-gray-100">
                            <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-500 mb-1">Motivo da Alteração</p>
                              <p className="text-sm text-gray-800 leading-relaxed">{item.motivoAlteracao}</p>
                            </div>
                          </div>
                        )}

                        {/* Informações Adicionais */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                          {item.validadoPor && (
                            <div className="flex items-start gap-3">
                              <User className="w-5 h-5 text-purple-600 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Validado por</p>
                                <p className="text-sm font-medium text-gray-800">{item.validadoPor}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Registrado em</p>
                              <p className="text-sm text-gray-700">
                                {formatarData(item.criadoEm)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card de Resumo */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-blue-900 mb-4 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resumo do Histórico
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-blue-700 mb-2 font-medium">Total de Endereços</p>
                  <p className="text-3xl font-bold text-blue-900">{totalEnderecos}</p>
                </div>

                {enderecoAtual && (
                  <>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-blue-700 mb-2 font-medium">Tempo no Endereço Atual</p>
                      <p className="text-3xl font-bold text-blue-900">{enderecoAtual.diasResidencia}</p>
                      <p className="text-xs text-gray-600 mt-1">dias de residência</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-blue-700 mb-2 font-medium">Cidade Atual</p>
                      <p className="text-xl font-bold text-blue-900">
                        {enderecoAtual.cidade}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{enderecoAtual.estado} - {enderecoAtual.regiaoEstado}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default function HistoricoEnderecosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Carregando página...</p>
            <p className="text-sm text-gray-500 mt-2">Aguarde um momento</p>
          </div>
        </div>
      }
    >
      <HistoricoEnderecosContent />
    </Suspense>
  );
}