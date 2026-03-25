/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, FileText, MapPin, Calendar, Phone, Hash, Clock,
  CheckCircle, AlertTriangle, Edit, Trash2, UserCheck, History,
  Loader2, ChevronRight, RefreshCw, Eye, ExternalLink,
  AlertCircle
} from 'lucide-react';
import { custodiadosService, comparecimentosService } from '@/lib/api/services';
import { useToast } from '@/components/Toast';
import { usePermissions } from '@/contexts/AuthContext';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import { formatarPeriodicidade } from '@/lib/utils/periodicidade';
import {
  FormattingCPF as formatCPF,
  FormattingRG as formatRG,
  FormattingPhone as formatContato,
  FormattingCEP as formatCEP
} from '@/lib/utils/formatting';
import ConfirmDialog from '@/components/ConfirmDialog';
import EditarCustodiadoModal from '@/components/EditarCustodiado';
import type { CustodiadoData, ComparecimentoResponse } from '@/types/api';

type TabType = 'resumo' | 'processos' | 'historico' | 'enderecos';

// ── Utilitários de data ──────────────────────────────────────

const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const fmtBR = (date: string | Date | null | undefined): string => {
  if (!date) return 'Não informado';
  if (typeof date === 'string') {
    const d = parseLocalDate(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return formatToBrazilianDate(date);
};

const getDaysUntil = (ds: string): number => {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  const t = parseLocalDate(ds); t.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - h.getTime()) / 86400000);
};

const isTodayStr = (ds: string): boolean => {
  const h = new Date();
  return ds === `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
};

const isOverdue = (ds: string): boolean => getDaysUntil(ds) < 0;

// ── Componente de badge de tipo de validação ────────────────

function TipoBadge({ tipo }: { tipo: string }) {
  const t = tipo?.toLowerCase() || '';
  const cfg =
    t === 'presencial' ? { bg: 'bg-green-100', text: 'text-green-800', label: 'Presencial' } :
      t === 'online' ? { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Online' } :
        { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Cadastro Inicial' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

// ── Componente principal ─────────────────────────────────────

export default function CustodiadoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { isAdmin } = usePermissions();
  const custodiadoId = parseInt(params.id as string);

  // Estados principais
  const [custodiado, setCustodiado] = useState<CustodiadoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('resumo');

  // Estados de ação
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estados do histórico de comparecimentos (Tab Histórico)
  const [comparecimentos, setComparecimentos] = useState<ComparecimentoResponse[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);

  // ── Carregar dados do custodiado ───────────────────────────

  const carregarDados = useCallback(async () => {
    if (!custodiadoId || isNaN(custodiadoId)) {
      setError('ID do custodiado inválido');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await custodiadosService.buscarPorId(custodiadoId);
      if (response && response.data) {
        setCustodiado(response.data as unknown as CustodiadoData);
      } else {
        setError('Custodiado não encontrado');
      }
    } catch (err) {
      console.error('[CustodiadoDetail] Erro ao carregar:', err);
      setError('Erro ao carregar dados do custodiado');
    } finally {
      setLoading(false);
    }
  }, [custodiadoId]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Carregar histórico quando tab mudar ────────────────────

  const carregarHistorico = useCallback(async () => {
    if (historicoCarregado || loadingHistorico) return;
    setLoadingHistorico(true);
    try {
      const data = await comparecimentosService.buscarPorCustodiado(custodiadoId);
      const arr = Array.isArray(data) ? data : (data as any)?.data || [];
      // Ordenar por data mais recente primeiro
      arr.sort((a: ComparecimentoResponse, b: ComparecimentoResponse) =>
        b.dataComparecimento.localeCompare(a.dataComparecimento)
      );
      setComparecimentos(arr);
      setHistoricoCarregado(true);
    } catch (err) {
      console.error('[CustodiadoDetail] Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistorico(false);
    }
  }, [custodiadoId, historicoCarregado, loadingHistorico]);

  useEffect(() => {
    if (activeTab === 'historico' && !historicoCarregado) {
      carregarHistorico();
    }
  }, [activeTab, historicoCarregado, carregarHistorico]);

  // ── Handlers de ação ───────────────────────────────────────

  const handleConfirmarPresenca = () => {
    if (custodiado) router.push(`/dashboard/comparecimento/confirmar?processo=${encodeURIComponent(custodiado.processo)}`);
  };

  const handleVerHistoricoEnderecos = () => {
    router.push(`/dashboard/historicoComparecimento/enderecos/${custodiadoId}`);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const resultado = await custodiadosService.excluir(custodiadoId);
      if (resultado.success) {
        showToast({ type: 'success', title: 'Arquivado', message: 'O custodiado foi arquivado com sucesso', duration: 3000 });
        setTimeout(() => router.push('/dashboard/geral'), 1500);
      } else {
        throw new Error(resultado.message || 'Erro ao arquivar');
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Erro desconhecido', duration: 5000 });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditSave = () => {
    setShowEditModal(false);
    carregarDados();
    setHistoricoCarregado(false); // Forçar reload do histórico
    showToast({ type: 'success', title: 'Atualizado', message: 'Informações salvas com sucesso', duration: 3000 });
  };

  // ── Loading / Error states ─────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Carregando dados do custodiado...</p>
          <p className="text-sm text-gray-400 mt-1">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (error || !custodiado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{error || 'Custodiado não encontrado'}</h2>
          <p className="text-gray-600 mb-6">Não foi possível carregar os dados solicitados.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              Voltar
            </button>
            <button onClick={carregarDados} className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 font-medium">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Variáveis derivadas ────────────────────────────────────

  const isConformidade = custodiado.status === 'EM_CONFORMIDADE';
  const proximoComp = typeof custodiado.proximoComparecimento === 'string'
    ? custodiado.proximoComparecimento
    : custodiado.proximoComparecimento instanceof Date
      ? custodiado.proximoComparecimento.toISOString().split('T')[0]
      : '';
  const compHoje = proximoComp ? isTodayStr(proximoComp) : false;
  const compAtrasado = proximoComp ? isOverdue(proximoComp) : false;
  const diasRestantes = proximoComp ? getDaysUntil(proximoComp) : 0;

  const tabs: { id: TabType; label: string; icon: any; badge?: string }[] = [
    { id: 'resumo', label: 'Resumo', icon: Eye },
    { id: 'processos', label: 'Processos', icon: FileText },
    { id: 'historico', label: 'Histórico', icon: History, badge: historicoCarregado ? `${comparecimentos.length}` : undefined },
    { id: 'enderecos', label: 'Endereços', icon: MapPin },
  ];

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-6">

      {/* ═══ HEADER COM STATUS ═══ */}
      <div className={`${isConformidade ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          {/* Voltar */}
          <button onClick={() => router.back()} className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a lista</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Info principal */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{custodiado.nome}</h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-white/85">
                  {custodiado.cpf && <span>CPF: {formatCPF(String(custodiado.cpf))}</span>}
                  {custodiado.rg && <><span className="text-white/40">|</span><span>RG: {formatRG(String(custodiado.rg))}</span></>}
                  {custodiado.contato && (
                    <><span className="text-white/40">|</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatContato(String(custodiado.contato))}</span></>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                    {isConformidade ? 'EM CONFORMIDADE' : 'INADIMPLENTE'}
                  </span>
                  {compHoje && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 animate-pulse">
                      COMPARECIMENTO HOJE
                    </span>
                  )}
                  {compAtrasado && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-300 text-red-900">
                      {Math.abs(diasRestantes)} DIA{Math.abs(diasRestantes) !== 1 ? 'S' : ''} EM ATRASO
                    </span>
                  )}
                  {!compAtrasado && !compHoje && diasRestantes > 0 && diasRestantes <= 7 && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-300 text-blue-900">
                      EM {diasRestantes} DIA{diasRestantes !== 1 ? 'S' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações do header */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button onClick={handleConfirmarPresenca}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg ${compHoje || compAtrasado
                    ? 'bg-white text-green-700 hover:bg-green-50 ring-2 ring-white/50'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }`}>
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Confirmar Presença</span>
                <span className="sm:hidden">Confirmar</span>
              </button>

              {isAdmin() && (
                <>
                  <button onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-white/15 text-white hover:bg-white/25 transition-all">
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-red-500/30 text-white hover:bg-red-500/50 transition-all disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Arquivar</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ CONTEÚDO DAS TABS ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── TAB: RESUMO ── */}
        {activeTab === 'resumo' && (
          <div className="space-y-6">
            {/* Cards de Status */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Próximo Comparecimento',
                  value: fmtBR(proximoComp),
                  valueColor: compAtrasado ? 'text-red-600' : compHoje ? 'text-yellow-600' : 'text-gray-800',
                  sub: proximoComp ? (compAtrasado ? `${Math.abs(diasRestantes)}d de atraso` : compHoje ? 'Hoje' : `Em ${diasRestantes}d`) : undefined
                },
                { icon: Clock, color: 'text-green-600', bg: 'bg-green-50', label: 'Último Comparecimento', value: fmtBR(custodiado.ultimoComparecimento) },
                { icon: Hash, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Periodicidade', value: formatarPeriodicidade(custodiado.periodicidade) },
                { icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Data da Decisão', value: fmtBR(custodiado.dataDecisao) },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                    <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
                  </div>
                  <p className={`text-base sm:text-xl font-bold ${card.valueColor || 'text-gray-800'}`}>{card.value}</p>
                  {card.sub && <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>}
                </div>
              ))}
            </div>

            {/* Dados Processuais */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-blue-50/60">
                <h3 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Dados Processuais
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div className="sm:col-span-2 lg:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Número do Processo</p>
                  <p className="font-mono text-sm text-gray-800 font-medium">{custodiado.processo}</p>
                </div>
                <div><p className="text-xs text-gray-500 mb-0.5">Vara</p><p className="text-sm text-gray-800 font-medium">{custodiado.vara}</p></div>
                <div><p className="text-xs text-gray-500 mb-0.5">Comarca</p><p className="text-sm text-gray-800 font-medium">{custodiado.comarca}</p></div>
                <div><p className="text-xs text-gray-500 mb-0.5">1º Comparecimento</p><p className="text-sm text-gray-800 font-medium">{fmtBR(custodiado.dataComparecimentoInicial)}</p></div>
                {custodiado.observacoes && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs text-gray-500 mb-0.5">Observações</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{custodiado.observacoes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço Atual */}
            {custodiado.endereco ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-green-50/60 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-green-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Endereço Atual
                  </h3>
                  <button onClick={handleVerHistoricoEnderecos} className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1 font-medium transition-colors">
                    <History className="w-3.5 h-3.5" /> Histórico <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><p className="text-xs text-gray-500 mb-0.5">CEP</p><p className="text-sm text-gray-800 font-medium">{formatCEP(custodiado.endereco.cep)}</p></div>
                  <div className="sm:col-span-1 lg:col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Logradouro</p>
                    <p className="text-sm text-gray-800 font-medium">
                      {custodiado.endereco.logradouro}{custodiado.endereco.numero ? `, ${custodiado.endereco.numero}` : ''}{custodiado.endereco.complemento ? ` - ${custodiado.endereco.complemento}` : ''}
                    </p>
                  </div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Bairro</p><p className="text-sm text-gray-800 font-medium">{custodiado.endereco.bairro}</p></div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Cidade</p><p className="text-sm text-gray-800 font-medium">{custodiado.endereco.cidade}</p></div>
                  <div><p className="text-xs text-gray-500 mb-0.5">Estado</p><p className="text-sm text-gray-800 font-medium">{custodiado.endereco.estado}</p></div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-yellow-800 font-medium text-sm">Endereço não cadastrado</p>
              </div>
            )}

            {/* Ações Rápidas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-3">Ações Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button onClick={handleConfirmarPresenca}
                  className={`flex items-center gap-3 p-4 rounded-lg transition-colors text-left ${compHoje || compAtrasado
                      ? 'bg-green-100 border-2 border-green-400 hover:bg-green-200'
                      : 'bg-green-50 border border-green-200 hover:bg-green-100'
                    }`}>
                  <UserCheck className={`w-6 h-6 ${compHoje || compAtrasado ? 'text-green-700' : 'text-green-600'}`} />
                  <div>
                    <p className={`font-medium ${compHoje || compAtrasado ? 'text-green-900' : 'text-green-800'}`}>Confirmar Presença</p>
                    <p className="text-xs text-green-600">Registrar comparecimento</p>
                  </div>
                  {(compHoje || compAtrasado) && <ChevronRight className="w-5 h-5 text-green-700 ml-auto" />}
                </button>

                <button onClick={handleVerHistoricoEnderecos}
                  className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  <div><p className="font-medium text-blue-800">Histórico de Endereços</p><p className="text-xs text-blue-600">Ver mudanças de endereço</p></div>
                </button>

                {isAdmin() && (
                  <button onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left">
                    <Edit className="w-6 h-6 text-purple-600" />
                    <div><p className="font-medium text-purple-800">Editar Dados</p><p className="text-xs text-purple-600">Modificar informações</p></div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: PROCESSOS ── */}
        {activeTab === 'processos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Processos Vinculados
                </h3>
              </div>
              <div className="p-5">
                <div className={`border rounded-lg p-4 ${compAtrasado ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-gray-800">{custodiado.processo}</p>
                      <p className="text-sm text-gray-500">{custodiado.vara} — {custodiado.comarca}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isConformidade ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isConformidade ? 'Em Conformidade' : 'Inadimplente'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ATIVO
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-gray-500 text-xs">Periodicidade</p><p className="font-medium mt-0.5">{formatarPeriodicidade(custodiado.periodicidade)}</p></div>
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-gray-500 text-xs">Decisão</p><p className="font-medium mt-0.5">{fmtBR(custodiado.dataDecisao)}</p></div>
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-gray-500 text-xs">Último</p><p className="font-medium mt-0.5">{fmtBR(custodiado.ultimoComparecimento)}</p></div>
                    <div className={`rounded-lg p-3 ${compAtrasado ? 'bg-red-100' : 'bg-gray-50'}`}><p className="text-gray-500 text-xs">Próximo</p><p className={`font-medium mt-0.5 ${compAtrasado ? 'text-red-700' : ''}`}>{fmtBR(proximoComp)}</p></div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                    <button onClick={handleConfirmarPresenca}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors">
                      <UserCheck className="w-4 h-4" /> Registrar Comparecimento
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Múltiplos processos</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Para vincular novos processos a este custodiado, utilize a API de Processos (POST /api/processos com o custodiadoId).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: HISTÓRICO ── */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Histórico de Comparecimentos
                  {historicoCarregado && <span className="ml-1 text-sm font-normal text-gray-500">({comparecimentos.length})</span>}
                </h3>
                <button onClick={() => router.push('/dashboard/historicoComparecimento')}
                  className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 font-medium">
                  Ver completo <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingHistorico ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mr-2" />
                  <span className="text-gray-600">Carregando histórico...</span>
                </div>
              ) : comparecimentos.length === 0 ? (
                <div className="p-8 text-center">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum comparecimento registrado</p>
                  <p className="text-gray-400 text-sm mt-1">Os registros aparecerão aqui após a confirmação de presença</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {comparecimentos.slice(0, 10).map((comp, i) => (
                    <div key={comp.id || i} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-primary/10' : 'bg-gray-100'
                            }`}>
                            <Calendar className={`w-4 h-4 ${i === 0 ? 'text-primary' : 'text-gray-500'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{fmtBR(comp.dataComparecimento)}</p>
                              {comp.horaComparecimento && <span className="text-xs text-gray-500">{comp.horaComparecimento}</span>}
                              <TipoBadge tipo={comp.tipoValidacao as string} />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              Validado por: {comp.validadoPor}
                              {comp.observacoes && <> — {comp.observacoes}</>}
                            </p>
                          </div>
                        </div>
                        {comp.mudancaEndereco && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex-shrink-0">
                            <MapPin className="w-3 h-3" /> Mudou endereço
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {comparecimentos.length > 10 && (
                    <div className="px-5 py-3 bg-gray-50 text-center">
                      <button onClick={() => router.push('/dashboard/historicoComparecimento')}
                        className="text-sm text-primary hover:text-primary-dark font-medium">
                        Ver todos os {comparecimentos.length} comparecimentos →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cards de resumo do histórico */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs text-gray-500">Primeiro Comparecimento</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{fmtBR(custodiado.dataComparecimentoInicial)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs text-gray-500">Último Comparecimento</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{fmtBR(custodiado.ultimoComparecimento)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs text-gray-500">Próximo Comparecimento</p>
                <p className={`text-sm font-semibold mt-1 ${compAtrasado ? 'text-red-600' : compHoje ? 'text-yellow-600' : 'text-gray-800'}`}>{fmtBR(proximoComp)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: ENDEREÇOS ── */}
        {activeTab === 'enderecos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Endereço
                </h3>
                <button onClick={handleVerHistoricoEnderecos}
                  className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 font-medium">
                  Ver histórico completo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-5">
                {custodiado.endereco ? (
                  <div className="border-2 border-green-200 bg-green-50/50 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="font-medium text-green-800">Endereço Atual (Ativo)</p>
                    </div>
                    <div className="space-y-1 text-sm text-gray-800">
                      <p className="font-medium">
                        {custodiado.endereco.logradouro}{custodiado.endereco.numero ? `, ${custodiado.endereco.numero}` : ''}
                        {custodiado.endereco.complemento ? ` - ${custodiado.endereco.complemento}` : ''}
                      </p>
                      <p>{custodiado.endereco.bairro}</p>
                      <p>{custodiado.endereco.cidade} - {custodiado.endereco.estado}</p>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">CEP: {formatCEP(custodiado.endereco.cep)}</p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium text-sm">Nenhum endereço cadastrado</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleVerHistoricoEnderecos}
              className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800 text-sm">Ver histórico completo de endereços</p>
                  <p className="text-xs text-gray-500">Timeline com todas as mudanças registradas</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ FOOTER INFO ═══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-2">
        <p className="text-xs text-center text-gray-400">
          ID: {custodiadoId} • Atualizado em: {custodiado.atualizadoEm ? fmtBR(custodiado.atualizadoEm) : 'N/A'}
        </p>
      </div>

      {/* ═══ MODALS ═══ */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        type="danger"
        title="Confirmar Arquivamento"
        message={`Tem certeza que deseja arquivar o registro de ${custodiado.nome}?`}
        details={[
          `Processo: ${custodiado.processo}`,
          `CPF: ${custodiado.cpf ? formatCPF(String(custodiado.cpf)) : 'Não informado'}`,
          `Status: ${isConformidade ? 'Em Conformidade' : 'Inadimplente'}`,
          'O registro será arquivado, não excluído permanentemente.'
        ]}
        confirmText="Sim, Arquivar"
        cancelText="Cancelar"
      />

      {showEditModal && (
        <EditarCustodiadoModal
          dados={{
            id: custodiadoId, nome: custodiado.nome, cpf: custodiado.cpf, rg: custodiado.rg,
            contato: custodiado.contato, processo: custodiado.processo, vara: custodiado.vara,
            comarca: custodiado.comarca, dataDecisao: custodiado.dataDecisao, periodicidade: custodiado.periodicidade,
            dataComparecimentoInicial: custodiado.dataComparecimentoInicial || '',
            status: custodiado.status === 'EM_CONFORMIDADE' ? 'em conformidade' : 'inadimplente',
            primeiroComparecimento: custodiado.dataComparecimentoInicial || '',
            ultimoComparecimento: custodiado.ultimoComparecimento || '',
            proximoComparecimento: proximoComp,
            endereco: custodiado.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
            observacoes: custodiado.observacoes
          } as any}
          onClose={() => setShowEditModal(false)}
          onVoltar={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
