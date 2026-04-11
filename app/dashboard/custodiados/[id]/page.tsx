/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, UserCheck, Edit, MapPin, Phone, FileText,
  Calendar, History, Loader2, AlertCircle, RefreshCw,
  Scale, Clock, Hash, AlertTriangle, CheckCircle, Info,
  ChevronDown, ChevronRight, Plus, X
} from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { useToastHelpers } from '@/components/Toast';
import { formatToBrazilianDate } from '@/lib/utils/dateutils';
import { FormattingCPF as formatCPF, FormattingPhone as formatPhone } from '@/lib/utils/formatting';
import EditarCustodiadoModal from '@/components/EditarCustodiado';
import EditarProcessoModal from '@/components/EditarProcessoModal';
import ProcessoForm from '@/components/ProcessoForm';
import ProcessoActions from '@/components/ProcessoActions';
import { usePermissions } from '@/contexts/AuthContext';
import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';
import type { Processo } from '@/types/processo';

interface CustodiadoResponse {
  id: string;
  numericId?: number;
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
    id: number; cep: string; logradouro: string; numero: string | null;
    complemento: string | null; bairro: string; cidade: string; estado: string;
    nomeEstado: string; enderecoCompleto: string; enderecoResumido: string;
    periodoResidencia: string; ativo: boolean;
  } | null;
  criadoEm: string;
  atualizadoEm: string | null;
}

interface ComparecimentoResumido {
  id: number; dataComparecimento: string; horaComparecimento: string | null;
  tipoValidacao: string; validadoPor: string; observacoes?: string; mudancaEndereco?: boolean;
}

const parseLocalDate = (ds: string): Date => { if (!ds) return new Date(); const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtBR = (d: string | null | undefined): string => { if (!d) return '—'; const dt = parseLocalDate(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; };
const getDaysUntil = (ds: string): number => { const h = new Date(); h.setHours(0, 0, 0, 0); const t = parseLocalDate(ds); t.setHours(0, 0, 0, 0); return Math.ceil((t.getTime() - h.getTime()) / 86400000); };
const isOverdue = (ds: string): boolean => getDaysUntil(ds) < 0;
const isTodayStr = (ds: string): boolean => { const h = new Date(); return ds === `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };

function TipoBadge({ tipo }: { tipo: string }) {
  const t = tipo?.toLowerCase() || '';
  const cfg = t === 'presencial' ? { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Presencial' }
    : t === 'online' ? { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Online' }
      : { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'Cadastro Inicial' };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
}

function StatusBadgeInline({ status, diasAtraso }: { status: string; diasAtraso: number }) {
  const isConf = status === 'EM_CONFORMIDADE';
  return (<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isConf ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
    {isConf ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
    {isConf ? 'Em Conformidade' : `Inadimplente${diasAtraso > 0 ? ` · ${diasAtraso}d` : ''}`}
  </span>);
}

function SituacaoBadge({ situacao }: { situacao: string }) {
  const cfg = situacao === 'ATIVO' ? { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Ativo' }
    : situacao === 'ENCERRADO' ? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: 'Encerrado' }
      : { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Suspenso' };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
}

function ProcessoDetailPanel({ processo, onClose }: { processo: Processo; onClose: () => void }) {
  const procAtrasado = processo.proximoComparecimento ? isOverdue(processo.proximoComparecimento) : false;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Detalhes do Processo</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {[
          { label: 'Nº Processo', value: processo.numeroProcesso, mono: true },
          { label: 'Vara', value: processo.vara },
          { label: 'Comarca', value: processo.comarca },
          { label: 'Periodicidade', value: processo.periodicidadeDescricao },
          { label: 'Data Decisão', value: fmtBR(processo.dataDecisao) },
          { label: 'Comp. Inicial', value: fmtBR(processo.dataComparecimentoInicial) },
          { label: 'Último Comp.', value: fmtBR(processo.ultimoComparecimento) },
          { label: 'Próximo Comp.', value: fmtBR(processo.proximoComparecimento), red: procAtrasado },
          { label: 'Situação', value: processo.situacaoProcesso, badge: true },
        ].map((item, i) => (
          <div key={i} className={`bg-white rounded-lg p-2.5 border ${item.red ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
            <p className="text-xs text-gray-500">{item.label}</p>
            {item.badge ? <SituacaoBadge situacao={item.value || ''} /> : (
              <p className={`font-medium text-xs mt-0.5 ${item.mono ? 'font-mono' : ''} ${item.red ? 'text-red-700' : 'text-gray-800'}`}>{item.value}</p>
            )}
          </div>
        ))}
      </div>
      {processo.observacoes && (
        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-0.5">Observações</p>
          <p className="text-xs text-gray-700">{processo.observacoes}</p>
        </div>
      )}
      <p className="text-xs text-gray-400">
        Criado em {fmtBR(processo.criadoEm?.split('T')[0])}
        {processo.atualizadoEm && ` · Atualizado em ${fmtBR(processo.atualizadoEm.split('T')[0])}`}
      </p>
    </div>
  );
}

function CustodiadoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const { success, error: showError } = useToastHelpers();
  const { isAdmin } = usePermissions();
  const custodiadoUuid = params.id as string;

  const [custodiado, setCustodiado] = useState<CustodiadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numericId, setNumericId] = useState<number | null>(null);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loadingProcessos, setLoadingProcessos] = useState(false);
  const [processosEncerradosAberto, setProcessosEncerradosAberto] = useState(false);
  const [processoExpandido, setProcessoExpandido] = useState<number | null>(null);
  const [processoEditando, setProcessoEditando] = useState<Processo | null>(null);
  const [comparecimentos, setComparecimentos] = useState<ComparecimentoResumido[]>([]);
  const [loadingComparecimentos, setLoadingComparecimentos] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProcessoForm, setShowProcessoForm] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!custodiadoUuid) { setError('ID inválido'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const resp = await httpClient.get<any>(`/custodiados/${custodiadoUuid}`);
      const data = resp.success ? (resp.data?.data || resp.data) : null;
      if (!data) { setError('Custodiado não encontrado'); setCustodiado(null); return; }
      setCustodiado(data);
      const rid = data.numericId || (typeof data.id === 'number' ? data.id : null);
      if (rid && typeof rid === 'number') { setNumericId(rid); }
      else { try { const pr = await httpClient.get<any>('/processos', { termo: data.processo, page: 0, size: 1 }); if (pr.success) { const l = pr.data?.data?.processos || pr.data?.processos || pr.data?.data || pr.data; const a = Array.isArray(l) ? l : []; if (a.length > 0 && a[0].custodiadoId) setNumericId(a[0].custodiadoId); } } catch { } }
    } catch (err: any) { setError(err.message || 'Erro ao carregar dados'); setCustodiado(null); }
    finally { setLoading(false); }
  }, [custodiadoUuid]);

  const carregarProcessos = useCallback(async () => {
    if (!numericId || numericId <= 0) return;
    setLoadingProcessos(true);
    try { const r = await httpClient.get<any>(`/processos/custodiado/${numericId}`); if (r.success && r.data) { const l = r.data?.data || r.data || []; setProcessos(Array.isArray(l) ? l : []); } }
    catch { setProcessos([]); } finally { setLoadingProcessos(false); }
  }, [numericId]);

  const carregarComparecimentos = useCallback(async () => {
    if (!numericId || numericId <= 0) return;
    setLoadingComparecimentos(true);
    try { const r = await httpClient.get<any>(`/comparecimentos/custodiado/${numericId}`); if (r.success && r.data) { const l = Array.isArray(r.data) ? r.data : (r.data?.data || []); setComparecimentos([...l].sort((a: any, b: any) => (b.dataComparecimento || '').localeCompare(a.dataComparecimento || '')).slice(0, 5)); } }
    catch { setComparecimentos([]); } finally { setLoadingComparecimentos(false); }
  }, [numericId]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { if (numericId) { carregarProcessos(); carregarComparecimentos(); } }, [numericId, carregarProcessos, carregarComparecimentos]);
  useEffect(() => { if (searchParams.get('refresh') === 'true') { carregarDados(); window.history.replaceState({}, '', window.location.pathname); } }, [searchParams, carregarDados]);

  const handleRegistrar = (processoId?: number) => {
    if (!custodiado) return;
    if (processoId) router.push(`/dashboard/comparecimento/confirmar?processoId=${processoId}`);
    else if (numericId && numericId > 0) router.push(`/dashboard/comparecimento/confirmar?custodiadoId=${numericId}`);
    else router.push(`/dashboard/comparecimento/confirmar?custodiadoId=${custodiado.id}`);
  };

  const handleEditCustodiadoSave = () => { setShowEditModal(false); carregarDados(); };
  const handleProcessoSaved = () => { setProcessoEditando(null); carregarProcessos(); carregarDados(); };
  const handleProcessoCreated = () => { setShowProcessoForm(false); carregarProcessos(); carregarDados(); };
  const handleProcessoActionComplete = () => { carregarProcessos(); carregarDados(); };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-5xl mx-auto space-y-6">
      <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4"><div className="h-8 w-64 bg-gray-200 animate-pulse rounded" /><div className="flex gap-4"><div className="h-5 w-32 bg-gray-200 animate-pulse rounded" /><div className="h-5 w-32 bg-gray-200 animate-pulse rounded" /></div></div>
    </div></div>
  );

  if (error || !custodiado) return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6"><div className="max-w-5xl mx-auto">
      <button onClick={() => router.push('/dashboard/geral')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"><ArrowLeft className="w-5 h-5" /><span>Voltar</span></button>
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div><h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3><p className="text-red-600 mb-4">{error || 'Custodiado não encontrado'}</p>
          <button onClick={carregarDados} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"><RefreshCw className="w-4 h-4" />Tentar Novamente</button></div>
      </div>
    </div>

    </div>
  );

  const c = custodiado;
  const processosAtivos = processos.filter(p => p.situacaoProcesso === 'ATIVO');
  const processosEncerrados = processos.filter(p => p.situacaoProcesso !== 'ATIVO');
  const statusGeral = processos.length > 0 ? (processos.some(p => p.situacaoProcesso === 'ATIVO' && p.inadimplente) ? 'INADIMPLENTE' : 'EM_CONFORMIDADE') : c.status;
  const isConformidade = statusGeral === 'EM_CONFORMIDADE';
  const totalAtivos = processosAtivos.length;
  const totalInadimplentes = processosAtivos.filter(p => p.inadimplente).length;

  const renderProcessoCard = (proc: Processo, faded: boolean = false) => {
    const procAtrasado = proc.proximoComparecimento ? isOverdue(proc.proximoComparecimento) : false;
    const procHoje = proc.proximoComparecimento ? isTodayStr(proc.proximoComparecimento) : false;
    const procDias = proc.proximoComparecimento ? getDaysUntil(proc.proximoComparecimento) : 0;
    const isExpanded = processoExpandido === proc.id;
    const isAtivo = proc.situacaoProcesso === 'ATIVO';
    return (
      <div key={proc.id} className={`transition-colors ${faded ? 'opacity-60' : ''} ${proc.inadimplente && isAtivo ? 'bg-red-50/40' : ''}`}>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <button onClick={() => setProcessoExpandido(prev => prev === proc.id ? null : proc.id)}
                  className="font-mono text-sm font-semibold text-gray-800 hover:text-primary transition-colors flex items-center gap-1">
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  {proc.numeroProcesso}
                </button>
                {isAtivo ? <StatusBadgeInline status={proc.status} diasAtraso={proc.diasAtraso} /> : <SituacaoBadge situacao={proc.situacaoProcesso} />}
              </div>
              <p className="text-sm text-gray-500">{proc.vara} · {proc.comarca}</p>
              {isAtivo && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{proc.periodicidadeDescricao}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Último: {fmtBR(proc.ultimoComparecimento)}</span>
                  <span className={`flex items-center gap-1 font-medium ${procAtrasado ? 'text-red-600' : procHoje ? 'text-amber-600' : ''}`}>
                    <Calendar className="w-3 h-3" />Próximo: {fmtBR(proc.proximoComparecimento)}
                    {procAtrasado && ` (${Math.abs(procDias)}d atraso)`}{procHoje && ' (HOJE)'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {isAdmin() && (
                <button onClick={() => setProcessoEditando(proc)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <Edit className="w-3.5 h-3.5" />Editar
                </button>
              )}
              {isAtivo && (
                <button onClick={() => handleRegistrar(proc.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${procAtrasado || procHoje ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                  <UserCheck className="w-4 h-4" /><span className="hidden sm:inline">Comparecimento</span>
                </button>
              )}
            </div>
          </div>
          {isAdmin() && (<div className="mt-2"><ProcessoActions processo={proc} onActionComplete={handleProcessoActionComplete} compact /></div>)}
        </div>
        {isExpanded && (<div className="px-5 pb-5"><ProcessoDetailPanel processo={proc} onClose={() => setProcessoExpandido(null)} /></div>)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <button onClick={() => router.push('/dashboard/geral')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /><span className="font-medium">Voltar</span>
        </button>

        <div className={`rounded-xl overflow-hidden shadow-sm border ${isConformidade ? 'border-emerald-200' : 'border-red-200'}`}>
          <div className={`px-6 py-5 ${isConformidade ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-red-600 to-red-700'} text-white`}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold truncate">{c.nome}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/80">
                  {c.cpf && <span>CPF: {formatCPF(c.cpf)}</span>}
                  {c.rg && <><span className="text-white/40">|</span><span>RG: {c.rg}</span></>}
                  {c.contato && !c.contatoPendente && (<><span className="text-white/40">|</span><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhone(c.contato)}</span></>)}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">{isConformidade ? 'EM CONFORMIDADE' : 'INADIMPLENTE'}</span>
                  {totalAtivos > 0 && (<span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm">{totalAtivos} processo{totalAtivos !== 1 ? 's' : ''} ativo{totalAtivos !== 1 ? 's' : ''}{totalInadimplentes > 0 && ` · ${totalInadimplentes} inadimplente${totalInadimplentes !== 1 ? 's' : ''}`}</span>)}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleRegistrar()} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all">
                  <UserCheck className="w-4 h-4" /><span className="hidden sm:inline">Registrar</span></button>
                <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all">
                  <Edit className="w-4 h-4" /><span className="hidden sm:inline">Editar Pessoa</span></button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />Processos Ativos
                {totalAtivos > 0 && <span className="text-xs font-normal text-gray-500">({totalAtivos})</span>}
              </h2>
              {isAdmin() && numericId && (<button onClick={() => setShowProcessoForm(true)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors"><Plus className="w-3.5 h-3.5" />Novo Processo</button>)}
            </div>
            {loadingProcessos ? (
              <div className="p-8 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin mr-2" /><span className="text-gray-500 text-sm">Carregando processos...</span></div>
            ) : processosAtivos.length === 0 ? (
              <div className="p-8 text-center"><FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">Nenhum processo ativo encontrado</p></div>
            ) : (
              <div className="divide-y divide-gray-50">{processosAtivos.map(proc => renderProcessoCard(proc))}</div>
            )}
            {processosEncerrados.length > 0 && (
              <div className="border-t border-gray-100">
                <button onClick={() => setProcessosEncerradosAberto(!processosEncerradosAberto)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                  <span className="flex items-center gap-2"><History className="w-4 h-4" />Processos Encerrados/Suspensos ({processosEncerrados.length})</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${processosEncerradosAberto ? 'rotate-180' : ''}`} />
                </button>
                {processosEncerradosAberto && (<div className="divide-y divide-gray-50">{processosEncerrados.map(proc => renderProcessoCard(proc, true))}</div>)}
              </div>
            )}
          </div>

          {c.endereco ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Endereço Atual</h2>
                {numericId && (<Link href={`/dashboard/historicoComparecimento/enderecos/${numericId}`} className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 font-medium"><History className="w-3.5 h-3.5" />Ver Histórico</Link>)}
              </div>
              <div className="p-5"><div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><MapPin className="w-5 h-5 text-emerald-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{c.endereco.logradouro}{c.endereco.numero ? `, ${c.endereco.numero}` : ''}{c.endereco.complemento ? ` - ${c.endereco.complemento}` : ''}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.endereco.bairro}</p>
                  <p className="text-sm text-gray-500">{c.endereco.cidade}/{c.endereco.estado}{c.endereco.cep ? ` · CEP: ${c.endereco.cep}` : ''}</p>
                  {c.endereco.periodoResidencia && <p className="text-xs text-gray-400 mt-1">{c.endereco.periodoResidencia}</p>}
                </div>
              </div></div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" /><p className="text-amber-800 font-medium text-sm">Endereço não cadastrado</p></div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Últimos Comparecimentos</h2>
              <Link href={`/dashboard/historicoComparecimento?busca=${encodeURIComponent(c.nome)}`} className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1">Ver Todos <ChevronRight className="w-3.5 h-3.5" /></Link>
            </div>
            {loadingComparecimentos ? (
              <div className="p-8 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin mr-2" /><span className="text-gray-500 text-sm">Carregando...</span></div>
            ) : comparecimentos.length === 0 ? (
              <div className="p-8 text-center"><Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">Nenhum comparecimento registrado</p></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {comparecimentos.map((comp, i) => (
                  <div key={comp.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-primary/10' : 'bg-gray-100'}`}>
                        <Calendar className={`w-4 h-4 ${i === 0 ? 'text-primary' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{fmtBR(comp.dataComparecimento)}</span>
                          {comp.horaComparecimento && <span className="text-xs text-gray-400">{comp.horaComparecimento}</span>}
                          <TipoBadge tipo={comp.tipoValidacao} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{comp.validadoPor}{comp.observacoes && <> · {comp.observacoes}</>}</p>
                      </div>
                    </div>
                    {comp.mudancaEndereco && (<span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-medium flex-shrink-0"><MapPin className="w-3 h-3" />Mudou</span>)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 text-center">
              Cadastrado em {formatToBrazilianDate(c.criadoEm)}{c.atualizadoEm ? ` · Atualizado em ${formatToBrazilianDate(c.atualizadoEm)}` : ''}{numericId ? ` · ID: ${numericId}` : ''}
            </p>
          </div>
        </div>
      </div>

      {showEditModal && custodiado && (
        <EditarCustodiadoModal
          dados={{
            id: numericId || c.id, nome: c.nome, cpf: c.cpf, rg: c.rg, contato: c.contato,
            processo: c.processo, vara: c.vara, comarca: c.comarca, dataDecisao: c.dataDecisao,
            periodicidade: c.periodicidade, dataComparecimentoInicial: c.dataComparecimentoInicial || '',
            status: c.status === 'EM_CONFORMIDADE' ? 'em conformidade' : 'inadimplente',
            primeiroComparecimento: c.dataComparecimentoInicial || '', ultimoComparecimento: c.ultimoComparecimento || '',
            proximoComparecimento: c.proximoComparecimento || '',
            endereco: c.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
            observacoes: c.observacoes
          } as any}
          onClose={() => setShowEditModal(false)} onVoltar={() => setShowEditModal(false)} onSave={handleEditCustodiadoSave} />
      )}

      {processoEditando && (
        <EditarProcessoModal processo={processoEditando} onClose={() => setProcessoEditando(null)} onSave={handleProcessoSaved} />
      )}

      {showProcessoForm && numericId && (
        <ProcessoForm custodiadoId={numericId} custodiadoNome={c.nome}
          onClose={() => setShowProcessoForm(false)} onSuccess={handleProcessoCreated} />
      )}
    </div>
  );
}

export default withSearchParams(CustodiadoDetalhesPage);
