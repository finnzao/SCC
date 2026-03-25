/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Edit, MapPin, Phone, FileText, Calendar, History, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { useToastHelpers } from '@/components/Toast';
import ProcessosList from '@/components/ProcessosList';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import { FormattingCPF as formatCPF, FormattingPhone as formatPhone } from '@/lib/utils/formatting';
import type { CustodiadoData } from '@/types/api';
import type { Processo } from '@/types/processo';
import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';

interface DadosPagina {
  custodiado: CustodiadoData | null;
  processos: Processo[];
  loadingCustodiado: boolean;
  loadingProcessos: boolean;
  error: string | null;
}

interface ComparecimentoResumido {
  id: number;
  dataComparecimento: string;
  horaComparecimento: string | null;
  tipoValidacao: string;
  validadoPor: string;
}

function CustodiadoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { success, error: showError } = useToastHelpers();

  const custodiadoId = parseInt(params.id as string);

  const [dados, setDados] = useState<DadosPagina>({
    custodiado: null,
    processos: [],
    loadingCustodiado: true,
    loadingProcessos: true,
    error: null,
  });

  const [comparecimentos, setComparecimentos] = useState<ComparecimentoResumido[]>([]);
  const [loadingComparecimentos, setLoadingComparecimentos] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState<string>('processos');

  const carregarDados = useCallback(async () => {
    if (!custodiadoId || isNaN(custodiadoId)) {
      setDados(prev => ({ ...prev, error: 'ID inválido', loadingCustodiado: false, loadingProcessos: false }));
      return;
    }

    setDados(prev => ({ ...prev, loadingCustodiado: true, loadingProcessos: true, error: null }));

    try {
      const [custResp, procResp] = await Promise.all([
        httpClient.get<any>(`/custodiados/${custodiadoId}`),
        httpClient.get<any>(`/processos/custodiado/${custodiadoId}`),
      ]);

      const custodiado = custResp.success ? (custResp.data?.data || custResp.data) : null;
      const processos = procResp.success ? (procResp.data?.data || procResp.data || []) : [];

      setDados({
        custodiado,
        processos: Array.isArray(processos) ? processos : [],
        loadingCustodiado: false,
        loadingProcessos: false,
        error: !custodiado ? 'Custodiado não encontrado' : null,
      });
    } catch (err: any) {
      setDados({
        custodiado: null,
        processos: [],
        loadingCustodiado: false,
        loadingProcessos: false,
        error: err.message || 'Erro ao carregar dados',
      });
    }
  }, [custodiadoId]);

  const carregarComparecimentos = useCallback(async () => {
    if (!custodiadoId || isNaN(custodiadoId)) return;
    setLoadingComparecimentos(true);
    try {
      const resp = await httpClient.get<any>(`/comparecimentos/custodiado/${custodiadoId}`);
      if (resp.success && resp.data) {
        const lista = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
        const ordenados = [...lista].sort((a: any, b: any) =>
          (b.dataComparecimento || '').localeCompare(a.dataComparecimento || '')
        );
        setComparecimentos(ordenados.slice(0, 5));
      }
    } catch {
      setComparecimentos([]);
    } finally {
      setLoadingComparecimentos(false);
    }
  }, [custodiadoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (dados.custodiado) {
      carregarComparecimentos();
    }
  }, [dados.custodiado, carregarComparecimentos]);

  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh === 'true') {
      carregarDados();
      carregarComparecimentos();
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [searchParams, carregarDados, carregarComparecimentos]);

  const handleRegistrar = () => {
    const processosAtivos = dados.processos.filter((p: Processo) => p.situacaoProcesso === 'ATIVO');

    if (processosAtivos.length === 0) {
      showError('Sem processos ativos', 'Nenhum processo ativo encontrado para este custodiado');
      return;
    }

    if (processosAtivos.length === 1) {
      router.push(`/dashboard/comparecimento/confirmar?processoId=${processosAtivos[0].id}`);
    } else {
      router.push(`/dashboard/comparecimento/confirmar?custodiadoId=${custodiadoId}`);
    }
  };

  const processosAtivos = dados.processos.filter((p: Processo) => p.situacaoProcesso === 'ATIVO');
  const botaoRegistrarDesabilitado = processosAtivos.length === 0;

  if (dados.loadingCustodiado) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
            <div className="flex gap-4">
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
            <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
            <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
            <div className="h-20 w-full bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (dados.error || !dados.custodiado) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{dados.error || 'Custodiado não encontrado'}</p>
              <button onClick={carregarDados} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const c = dados.custodiado;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{c.nome}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                {c.cpf && <span>CPF: {formatCPF(c.cpf)}</span>}
                {c.rg && <span>RG: {c.rg}</span>}
                {c.contato && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {formatPhone(c.contato)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRegistrar}
                disabled={botaoRegistrarDesabilitado}
                title={botaoRegistrarDesabilitado ? 'Nenhum processo ativo' : 'Registrar comparecimento'}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <UserCheck className="w-5 h-5" />
                Registrar
              </button>
              <button
                onClick={() => router.push(`/dashboard/geral`)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                <Edit className="w-5 h-5" />
                Editar
              </button>
            </div>
          </div>
        </div>

        {c.endereco && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Endereço Atual
              </h2>
              <Link
                href={`/dashboard/historicoComparecimento/enderecos/${custodiadoId}`}
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
              >
                <History className="w-4 h-4" />
                Ver Histórico de Endereços
              </Link>
            </div>
            <div className="text-gray-700 space-y-1">
              <p>
                {c.endereco.logradouro}
                {c.endereco.numero ? `, ${c.endereco.numero}` : ''}
                {c.endereco.complemento ? ` - ${c.endereco.complemento}` : ''}
              </p>
              <p>
                {c.endereco.bairro}
              </p>
              <p>
                {c.endereco.cidade}/{c.endereco.estado}
                {c.endereco.cep ? ` - CEP: ${c.endereco.cep}` : ''}
              </p>
            </div>
          </div>
        )}

        <div className="md:hidden space-y-3">
          <button
            onClick={() => setSecaoAberta(secaoAberta === 'processos' ? '' : 'processos')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
          >
            <span className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Processos ({dados.processos.length})
            </span>
            <span className="text-gray-400">{secaoAberta === 'processos' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'processos' && (
            <ProcessosList custodiadoId={custodiadoId} custodiadoNome={c.nome} />
          )}

          <button
            onClick={() => setSecaoAberta(secaoAberta === 'comparecimentos' ? '' : 'comparecimentos')}
            className="w-full bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
          >
            <span className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Últimos Comparecimentos
            </span>
            <span className="text-gray-400">{secaoAberta === 'comparecimentos' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'comparecimentos' && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              {loadingComparecimentos ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : comparecimentos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum comparecimento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {comparecimentos.map((comp) => (
                    <div key={comp.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {formatToBrazilianDate(comp.dataComparecimento)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          comp.tipoValidacao?.toLowerCase() === 'presencial'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {comp.tipoValidacao}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {comp.horaComparecimento ? `${comp.horaComparecimento} — ` : ''}
                        Validado por: {comp.validadoPor}
                      </p>
                    </div>
                  ))}
                  <Link
                    href={`/dashboard/historicoComparecimento?busca=${encodeURIComponent(c.nome)}`}
                    className="block text-center text-sm text-primary hover:text-primary-dark font-medium mt-2"
                  >
                    Ver todos →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <ProcessosList custodiadoId={custodiadoId} custodiadoNome={c.nome} />
        </div>

        <div className="hidden md:block bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Últimos Comparecimentos
            </h2>
            <Link
              href={`/dashboard/historicoComparecimento?busca=${encodeURIComponent(c.nome)}`}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              Ver Todos →
            </Link>
          </div>
          {loadingComparecimentos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : comparecimentos.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Nenhum comparecimento registrado.</p>
          ) : (
            <div className="space-y-3">
              {comparecimentos.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-800 w-24">
                      {formatToBrazilianDate(comp.dataComparecimento)}
                    </span>
                    <span className="text-sm text-gray-600 w-20">
                      {comp.horaComparecimento || '-'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      comp.tipoValidacao?.toLowerCase() === 'presencial'
                        ? 'bg-green-100 text-green-700'
                        : comp.tipoValidacao?.toLowerCase() === 'online'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {comp.tipoValidacao}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Validado por: {comp.validadoPor}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withSearchParams(CustodiadoDetalhesPage);
