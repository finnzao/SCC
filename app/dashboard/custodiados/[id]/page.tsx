/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, UserCheck, Edit, MapPin, Phone, FileText,
  Calendar, History, Loader2, AlertCircle, RefreshCw,
  Scale, Clock, Hash, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { useToastHelpers } from '@/components/Toast';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import { FormattingCPF as formatCPF, FormattingPhone as formatPhone } from '@/lib/utils/formatting';
import EditarCustodiadoModal from '@/components/EditarCustodiado';
import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';

/**
 * All data comes from a SINGLE call: GET /api/custodiados/{uuid}
 *
 * The response already contains: processo, vara, comarca, dataDecisao,
 * periodicidade, status, ultimoComparecimento, proximoComparecimento,
 * diasAtraso, endereco, observacoes — no need for separate API calls.
 *
 * For comparecimentos history we use: GET /api/comparecimentos/custodiado/{uuid}
 * (the backend accepts UUID in this endpoint too based on the response structure)
 */

interface CustodiadoResponse {
  id: string; // UUID
  nome: string;
  cpf: string | null;
  rg: string | null;
  contato: string | null;
  contatoPendente: boolean;
  identificacao: string;
  processo: string;
  vara: string;
  comarca: string;
  dataDecisao: string;
  periodicidade: number;
  periodicidadeDescricao: string;
  dataComparecimentoInicial: string;
  status: string;
  ultimoComparecimento: string | null;
  proximoComparecimento: string | null;
  diasAtraso: number;
  observacoes: string | null;
  inadimplente: boolean;
  comparecimentoHoje: boolean;
  endereco: {
    id: number;
    cep: string;
    logradouro: string;
    numero: string | null;
    complemento: string | null;
    bairro: string;
    cidade: string;
    estado: string;
    nomeEstado: string;
    enderecoCompleto: string;
    enderecoResumido: string;
    periodoResidencia: string;
    ativo: boolean;
  } | null;
  criadoEm: string;
  atualizadoEm: string | null;
}

interface ComparecimentoResumido {
  id: number;
  dataComparecimento: string;
  horaComparecimento: string | null;
  tipoValidacao: string;
  validadoPor: string;
}

function statusBadge(status: string, inadimplente: boolean) {
  if (inadimplente || status === 'INADIMPLENTE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        <AlertTriangle className="w-4 h-4" /> Inadimplente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
      <CheckCircle className="w-4 h-4" /> Em Conformidade
    </span>
  );
}

function CustodiadoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { success, error: showError } = useToastHelpers();

  const custodiadoUuid = params.id as string;

  const [custodiado, setCustodiado] = useState<CustodiadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comparecimentos, setComparecimentos] = useState<ComparecimentoResumido[]>([]);
  const [loadingComparecimentos, setLoadingComparecimentos] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  // ─── Single API call for all custodiado data ───────────────

  const carregarDados = useCallback(async () => {
    if (!custodiadoUuid) {
      setError('ID inválido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await httpClient.get<any>(`/custodiados/${custodiadoUuid}`);
      const data = resp.success ? (resp.data?.data || resp.data) : null;

      if (!data) {
        setError('Custodiado não encontrado');
        setCustodiado(null);
      } else {
        setCustodiado(data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      setCustodiado(null);
    } finally {
      setLoading(false);
    }
  }, [custodiadoUuid]);

  // ─── Comparecimentos (lazy load, uses UUID) ────────────────

  const carregarComparecimentos = useCallback(async () => {
    if (!custodiadoUuid) return;

    setLoadingComparecimentos(true);
    try {
      const resp = await httpClient.get<any>(`/comparecimentos/custodiado/${custodiadoUuid}`);
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
  }, [custodiadoUuid]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    if (custodiado) carregarComparecimentos();
  }, [custodiado, carregarComparecimentos]);

  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      carregarDados();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, carregarDados]);

  // ─── Actions ───────────────────────────────────────────────

  const handleRegistrar = () => {
    if (!custodiado) return;
    // Use the UUID — the comparecimento/confirmar page will resolve it
    router.push(`/dashboard/comparecimento/confirmar?custodiadoId=${custodiado.id}`);
  };

  const handleEditSave = () => {
    setShowEditModal(false);
    carregarDados();
    success('Atualizado', 'Informações salvas com sucesso');
  };

  // ─── Loading state ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
            <div className="flex gap-4">
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
            <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────

  if (error || !custodiado) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
            <ArrowLeft className="w-5 h-5" /><span>Voltar</span>
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{error || 'Custodiado não encontrado'}</p>
              <button onClick={carregarDados} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                <RefreshCw className="w-4 h-4" />Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const c = custodiado;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">Voltar</span>
        </button>

        {/* ═══ HEADER: Nome + Status + Botões ═══ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{c.nome}</h1>
                {statusBadge(c.status, c.inadimplente)}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {c.cpf && <span className="flex items-center gap-1">CPF: {formatCPF(c.cpf)}</span>}
                {c.rg && <span className="flex items-center gap-1">RG: {c.rg}</span>}
                {c.contato && !c.contatoPendente && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{formatPhone(c.contato)}
                  </span>
                )}
                {c.contatoPendente && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Phone className="w-3.5 h-3.5" />Pendente
                  </span>
                )}
              </div>
              {c.diasAtraso > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {c.diasAtraso} {c.diasAtraso === 1 ? 'dia' : 'dias'} em atraso
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleRegistrar}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium"
              >
                <UserCheck className="w-5 h-5" />Registrar
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark font-medium"
              >
                <Edit className="w-5 h-5" />Editar
              </button>
            </div>
          </div>
        </div>

        {/* ═══ DADOS DO PROCESSO ═══ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-800">Dados do Processo</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" />Processo</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{c.processo}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Vara</p>
              <p className="text-sm font-medium text-gray-900">{c.vara}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Comarca</p>
              <p className="text-sm font-medium text-gray-900">{c.comarca}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Data da Decisão</p>
              <p className="text-sm font-medium text-gray-900">{formatToBrazilianDate(c.dataDecisao)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Periodicidade</p>
              <p className="text-sm font-medium text-gray-900">{c.periodicidadeDescricao} ({c.periodicidade} dias)</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Comparecimento Inicial</p>
              <p className="text-sm font-medium text-gray-900">{formatToBrazilianDate(c.dataComparecimentoInicial)}</p>
            </div>
          </div>

          {/* Comparecimento dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className={`rounded-lg p-3 ${c.inadimplente ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Último Comparecimento</p>
              <p className={`text-sm font-semibold ${c.inadimplente ? 'text-red-800' : 'text-blue-800'}`}>
                {c.ultimoComparecimento ? formatToBrazilianDate(c.ultimoComparecimento) : 'Nenhum registrado'}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Próximo Comparecimento</p>
              <p className="text-sm font-semibold text-blue-800">
                {c.proximoComparecimento ? formatToBrazilianDate(c.proximoComparecimento) : '—'}
              </p>
            </div>
          </div>

          {c.observacoes && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Info className="w-3 h-3" />Observações</p>
              <p className="text-sm text-gray-800">{c.observacoes}</p>
            </div>
          )}
        </div>

        {/* ═══ ENDEREÇO ═══ */}
        {c.endereco && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />Endereço Atual
              </h2>
              <Link
                href={`/dashboard/historicoComparecimento/enderecos/${c.id}`}
                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
              >
                <History className="w-4 h-4" />Ver Histórico
              </Link>
            </div>
            <div className="text-gray-700 space-y-1">
              <p>
                {c.endereco.logradouro}
                {c.endereco.numero ? `, ${c.endereco.numero}` : ''}
                {c.endereco.complemento ? ` - ${c.endereco.complemento}` : ''}
              </p>
              <p>{c.endereco.bairro}</p>
              <p>{c.endereco.cidade}/{c.endereco.estado}{c.endereco.cep ? ` - CEP: ${c.endereco.cep}` : ''}</p>
            </div>
            {c.endereco.periodoResidencia && (
              <p className="text-xs text-gray-500 mt-2">{c.endereco.periodoResidencia}</p>
            )}
          </div>
        )}

        {/* ═══ ÚLTIMOS COMPARECIMENTOS ═══ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />Últimos Comparecimentos
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
                <div key={comp.id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-800 w-24">{formatToBrazilianDate(comp.dataComparecimento)}</span>
                    <span className="text-sm text-gray-600 w-20">{comp.horaComparecimento || '-'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      comp.tipoValidacao?.toLowerCase() === 'presencial' ? 'bg-green-100 text-green-700' :
                      comp.tipoValidacao?.toLowerCase() === 'online' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>{comp.tipoValidacao}</span>
                  </div>
                  <span className="text-sm text-gray-500">Validado por: {comp.validadoPor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ INFO CADASTRAL ═══ */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-xs text-gray-400 text-center">
            Cadastrado em {formatToBrazilianDate(c.criadoEm)}
            {c.atualizadoEm ? ` · Atualizado em ${formatToBrazilianDate(c.atualizadoEm)}` : ''}
          </p>
        </div>
      </div>

      {/* ═══ MODAL DE EDIÇÃO ═══ */}
      {showEditModal && custodiado && (
        <EditarCustodiadoModal
          dados={{
            id: c.id,
            nome: c.nome,
            cpf: c.cpf,
            rg: c.rg,
            contato: c.contato,
            processo: c.processo,
            vara: c.vara,
            comarca: c.comarca,
            dataDecisao: c.dataDecisao,
            periodicidade: c.periodicidade,
            dataComparecimentoInicial: c.dataComparecimentoInicial || '',
            status: c.status === 'EM_CONFORMIDADE' ? 'em conformidade' : 'inadimplente',
            primeiroComparecimento: c.dataComparecimentoInicial || '',
            ultimoComparecimento: c.ultimoComparecimento || '',
            proximoComparecimento: c.proximoComparecimento || '',
            endereco: c.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
            observacoes: c.observacoes
          } as any}
          onClose={() => setShowEditModal(false)}
          onVoltar={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

export default withSearchParams(CustodiadoDetalhesPage);
