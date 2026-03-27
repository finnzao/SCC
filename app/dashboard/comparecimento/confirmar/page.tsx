/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Clock,
  FileText,
  Save,
  ArrowLeft,
  MapPin,
  UserCheck,
  Search,
  RefreshCw,
  ChevronRight,
  Hash,
  type LucideIcon
} from 'lucide-react';

import { useCustodiados } from '@/hooks/useAPI';
import { CustodiadoData, TipoValidacao } from '@/types/api';
import type { Processo } from '@/types/processo';
import EnderecoForm from '@/components/EnderecoForm';
import { useToastHelpers } from '@/components/Toast';
import { calcularProximoComparecimento, formatarPeriodicidade } from '@/lib/utils/periodicidade';

import {
  FormularioComparecimento,
  AtualizacaoEndereco,
  EstadoPagina,
  dateUtils,
  Endereco
} from '@/types/comparecimento';

import { useSearchParamsSafe, withSearchParams } from '@/hooks/useSearchParamsSafe';
import { authService } from '@/lib/api/authService';
import { normalizarDataParaEnvio } from '@/lib/utils/formatting';
import { httpClient } from '@/lib/http/client';

declare global {
  interface Window {
    enderecoTimeout?: NodeJS.Timeout;
  }
}

function getNumericIdFromProcesso(proc: any): number {
  if (proc.custodiadoId && typeof proc.custodiadoId === 'number') return proc.custodiadoId;
  if (proc.data?.custodiadoId && typeof proc.data.custodiadoId === 'number') return proc.data.custodiadoId;
  const parsed = parseInt(proc.custodiadoId || proc.data?.custodiadoId);
  return (!isNaN(parsed) && parsed > 0) ? parsed : 0;
}

function buildCustodiadoFromProcesso(proc: any): CustodiadoData {
  const numId = getNumericIdFromProcesso(proc);
  return {
    id: numId,
    numericId: numId,
    nome: proc.custodiadoNome || '',
    cpf: proc.custodiadoCpf || '',
    rg: '',
    contato: '',
    processo: proc.numeroProcesso || '',
    vara: proc.vara || '',
    comarca: proc.comarca || '',
    dataDecisao: proc.dataDecisao || '',
    periodicidade: proc.periodicidade || 30,
    status: proc.status,
    ultimoComparecimento: proc.ultimoComparecimento || '',
    proximoComparecimento: proc.proximoComparecimento || '',
    cep: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    estado: '',
    criadoEm: proc.criadoEm || '',
    atualizadoEm: proc.atualizadoEm || null,
  } as CustodiadoData;
}

function enrichWithListData(base: CustodiadoData, list: CustodiadoData[] | null, targetNumericId: number): CustodiadoData {
  if (!list || !Array.isArray(list) || targetNumericId <= 0) return base;
  const match = list.find((c: any) => {
    const n = c.numericId || c.id;
    return (typeof n === 'number' ? n : parseInt(String(n))) === targetNumericId;
  });
  if (!match) return base;
  return { ...base, ...match, id: targetNumericId, numericId: targetNumericId } as CustodiadoData;
}

function resolveNumericId(custodiado: CustodiadoData | null): number {
  if (!custodiado) return 0;
  const raw = (custodiado as any).numericId || custodiado.id;
  const num = typeof raw === 'number' ? raw : parseInt(String(raw));
  return (!isNaN(num) && num > 0) ? num : 0;
}

function isUUID(val: any): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val));
}

function resolveCustodiadoUuid(custodiado: CustodiadoData | null, custodiados: CustodiadoData[] | null): string | null {
  if (!custodiado) return null;
  const rawId = (custodiado as any).publicId || (custodiado as any).uuid;
  if (rawId && isUUID(rawId)) return String(rawId);
  if (isUUID(custodiado.id)) return String(custodiado.id);
  if (!custodiados || !Array.isArray(custodiados)) return null;
  const numId = resolveNumericId(custodiado);
  const match = custodiados.find((c: any) => {
    if (isUUID(c.id) || isUUID(c.publicId)) {
      const cNumId = c.numericId || (typeof c.id === 'number' ? c.id : 0);
      if (typeof cNumId === 'number' && cNumId === numId) return true;
    }
    return false;
  });
  if (match) {
    const uuid = (match as any).publicId || (isUUID(match.id) ? match.id : null);
    if (uuid) return String(uuid);
  }
  const nameMatch = custodiados.find((c: any) => c.nome === custodiado.nome && (isUUID(c.id) || isUUID(c.publicId)));
  if (nameMatch) {
    const uuid = (nameMatch as any).publicId || (isUUID(nameMatch.id) ? nameMatch.id : null);
    if (uuid) return String(uuid);
  }
  return null;
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
          i < currentStep ? 'bg-primary w-8' : i === currentStep ? 'bg-primary/50 w-6' : 'bg-gray-200 w-4'
        }`} />
      ))}
    </div>
  );
}

function SeletorProcesso({
  processos,
  selecionado,
  onSelecionar
}: {
  processos: Processo[];
  selecionado: Processo | null;
  onSelecionar: (p: Processo) => void;
}) {
  return (
    <div className="space-y-2">
      {processos.map(p => {
        const isSelected = selecionado?.id === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelecionar(p)}
            className={`w-full text-left p-4 border-2 rounded-xl transition-all ${
              isSelected
                ? 'border-primary bg-blue-50/80 shadow-sm'
                : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-mono font-semibold text-gray-800 text-sm">{p.numeroProcesso}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{p.vara}</span>
                  <span className="text-gray-300">·</span>
                  <span>{p.comarca}</span>
                  <span className="text-gray-300">·</span>
                  <span>{p.periodicidadeDescricao}</span>
                </div>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.status === 'EM_CONFORMIDADE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {p.status === 'EM_CONFORMIDADE' ? 'Em Conformidade' : `Inadimplente${p.diasAtraso > 0 ? ` · ${p.diasAtraso}d` : ''}`}
                </span>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-all ${
                isSelected ? 'border-primary bg-primary' : 'border-gray-300'
              }`}>
                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ConfirmarPresencaPage() {
  const router = useRouter();
  const searchParams = useSearchParamsSafe();
  const processoParam = searchParams.get('processo');
  const processoIdParam = searchParams.get('processoId');
  const custodiadoIdParam = searchParams.get('custodiadoId');
  const { success, error } = useToastHelpers();
  const { custodiados, loading: loadingCustodiados, error: errorCustodiados, refetch } = useCustodiados();
  const [loadingComparecimento, setLoadingComparecimento] = useState(false);
  const [custodiado, setCustodiado] = useState<CustodiadoData | null>(null);
  const [estado, setEstado] = useState<EstadoPagina>('inicial');
  const [mensagem, setMensagem] = useState('');
  const [buscaProcesso, setBuscaProcesso] = useState(processoParam || '');
  const [resultadosBusca, setResultadosBusca] = useState<CustodiadoData[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState('');

  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [processosDisponiveis, setProcessosDisponiveis] = useState<Processo[]>([]);
  const [temMultiplosProcessos, setTemMultiplosProcessos] = useState(false);

  const [formulario, setFormulario] = useState<FormularioComparecimento>({
    dataComparecimento: dateUtils.getCurrentDate(),
    horaComparecimento: dateUtils.getCurrentTime(),
    tipoValidacao: TipoValidacao.PRESENCIAL,
    observacoes: '',
    validadoPor: ''
  });
  const [atualizacaoEndereco, setAtualizacaoEndereco] = useState<AtualizacaoEndereco>({ houveAlteracao: false });
  const [enderecoRespondido, setEnderecoRespondido] = useState(false);
  const [proximoComparecimento, setProximoComparecimento] = useState<string | null>(null);
  const [buscaInicialFeita, setBuscaInicialFeita] = useState(false);

  const currentStep = !custodiado ? 0 : !processoSelecionado && temMultiplosProcessos ? 1 : !enderecoRespondido ? 2 : 3;
  const podeConfirmar = !!processoSelecionado && enderecoRespondido && !loadingComparecimento;

  useEffect(() => {
    try {
      const userData = authService.getUserData();
      const nome = userData?.nome || 'Servidor Atual';
      setNomeUsuarioLogado(nome);
      setFormulario(prev => ({ ...prev, validadoPor: nome }));
    } catch {
      setNomeUsuarioLogado('Servidor Atual');
      setFormulario(prev => ({ ...prev, validadoPor: 'Servidor Atual' }));
    }
  }, []);

  const carregarProcessosAtivos = useCallback(async (numericId: number): Promise<Processo[]> => {
    try {
      const resp = await httpClient.get<any>(`/processos/custodiado/${numericId}`);
      if (resp.success) {
        const procs = resp.data?.data || resp.data || [];
        return procs.filter((p: any) => p.situacaoProcesso === 'ATIVO');
      }
    } catch { /* ignore */ }
    return [];
  }, []);

  const definirProcessos = useCallback((ativos: Processo[]) => {
    if (ativos.length === 1) {
      setProcessoSelecionado(ativos[0]);
      setProcessosDisponiveis(ativos);
      setTemMultiplosProcessos(false);
    } else if (ativos.length > 1) {
      setProcessoSelecionado(null);
      setProcessosDisponiveis(ativos);
      setTemMultiplosProcessos(true);
    } else {
      setProcessoSelecionado(null);
      setProcessosDisponiveis([]);
      setTemMultiplosProcessos(false);
    }
  }, []);

  useEffect(() => {
    if (!processoIdParam) return;
    const carregar = async () => {
      try {
        setEstado('buscando');
        const resp = await httpClient.get<any>(`/processos/${processoIdParam}`);
        if (resp.success && resp.data) {
          const proc = resp.data.data || resp.data;
          setProcessoSelecionado(proc);
          setProcessosDisponiveis([proc]);
          setTemMultiplosProcessos(false);
          const fromProc = buildCustodiadoFromProcesso(proc);
          const numId = getNumericIdFromProcesso(proc);
          const enriched = enrichWithListData(fromProc, custodiados, numId);
          setCustodiado(enriched);
          if (numId > 0) {
            const todosAtivos = await carregarProcessosAtivos(numId);
            if (todosAtivos.length > 1) {
              setProcessosDisponiveis(todosAtivos);
              setTemMultiplosProcessos(true);
            }
          }
        }
      } catch (err) {
        error('Erro', 'Não foi possível carregar o processo');
      } finally {
        setEstado('inicial');
      }
    };
    carregar();
  }, [processoIdParam, custodiados]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!custodiadoIdParam || processoIdParam) return;
    const carregar = async () => {
      try {
        setEstado('buscando');
        const numId = parseInt(custodiadoIdParam);
        if (isNaN(numId) || numId <= 0) {
          if (custodiados && custodiados.length > 0) {
            const match = custodiados.find((c: any) => String(c.id) === custodiadoIdParam);
            if (match) {
              const resolvedNumId = (match as any).numericId || match.id;
              const resolvedNum = typeof resolvedNumId === 'number' ? resolvedNumId : parseInt(String(resolvedNumId));
              if (!isNaN(resolvedNum) && resolvedNum > 0) {
                const ativos = await carregarProcessosAtivos(resolvedNum);
                if (ativos.length >= 1) {
                  const fromProc = buildCustodiadoFromProcesso(ativos[0]);
                  fromProc.id = resolvedNum;
                  (fromProc as any).numericId = resolvedNum;
                  const enriched = enrichWithListData(fromProc, custodiados, resolvedNum);
                  setCustodiado(enriched);
                  definirProcessos(ativos);
                }
              }
            }
          }
          return;
        }
        const ativos = await carregarProcessosAtivos(numId);
        if (ativos.length >= 1) {
          const fromProc = buildCustodiadoFromProcesso(ativos[0]);
          fromProc.id = numId;
          (fromProc as any).numericId = numId;
          const enriched = enrichWithListData(fromProc, custodiados, numId);
          setCustodiado(enriched);
          definirProcessos(ativos);
        }
      } catch {
        error('Erro', 'Não foi possível carregar os dados');
      } finally {
        setEstado('inicial');
      }
    };
    carregar();
  }, [custodiadoIdParam, processoIdParam, custodiados]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizarTexto = useCallback((texto: string): string => {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }, []);

  const buscarPessoa = useCallback(async () => {
    const termo = buscaProcesso.trim();
    if (!termo) { error('Campo vazio', 'Digite um termo para buscar'); return; }
    if (!custodiados || custodiados.length === 0) { error('Dados não carregados', 'Aguarde o carregamento dos dados'); return; }
    setEstado('buscando');
    setMostrarResultados(false);
    setResultadosBusca([]);
    try {
      const tn = normalizarTexto(termo);
      const encontrados = custodiados.filter(p =>
        normalizarTexto(p.nome).includes(tn) || normalizarTexto(p.processo).includes(tn) || (p.cpf ? normalizarTexto(p.cpf).includes(tn) : false)
      );
      setEstado('inicial');
      if (encontrados.length > 0) {
        setResultadosBusca(encontrados);
        setMostrarResultados(true);
      } else {
        error('Não encontrado', 'Nenhuma pessoa encontrada para o termo informado');
      }
    } catch {
      setEstado('inicial');
      error('Erro na busca', 'Ocorreu um erro ao buscar');
    }
  }, [buscaProcesso, custodiados, error, normalizarTexto]);

  const selecionarPessoa = useCallback(async (pessoa: CustodiadoData) => {
    setCustodiado(pessoa);
    setMostrarResultados(false);
    setProcessoSelecionado(null);
    setProcessosDisponiveis([]);
    setTemMultiplosProcessos(false);
    setEnderecoRespondido(false);
    setAtualizacaoEndereco({ houveAlteracao: false });
    const numId = resolveNumericId(pessoa);
    if (numId > 0) {
      const ativos = await carregarProcessosAtivos(numId);
      definirProcessos(ativos);
    }
    success('Pessoa selecionada', `${pessoa.nome}`);
  }, [success, carregarProcessosAtivos, definirProcessos]);

  const selecionarProcesso = useCallback((proc: Processo) => {
    setProcessoSelecionado(proc);
    success('Processo selecionado', proc.numeroProcesso);
  }, [success]);

  const trocarProcesso = useCallback(() => {
    setProcessoSelecionado(null);
    setEnderecoRespondido(false);
    setAtualizacaoEndereco({ houveAlteracao: false });
  }, []);

  useEffect(() => {
    if (processoParam && custodiados && custodiados.length > 0 && !custodiado && !buscaInicialFeita) {
      setBuscaInicialFeita(true);
      buscarPessoa();
    }
  }, [processoParam, custodiados, custodiado, buscaInicialFeita, buscarPessoa]);

  useEffect(() => {
    if (estado === 'sucesso' && custodiado && custodiado.periodicidade) {
      const prox = calcularProximoComparecimento(formulario.dataComparecimento, processoSelecionado?.periodicidade || custodiado.periodicidade);
      setProximoComparecimento(dateUtils.formatToBR(prox));
    }
  }, [estado, custodiado, processoSelecionado, formulario.dataComparecimento]);

  const formatarHora = (hora: string): string => {
    if (!hora) return '00:00:00';
    if (/^\d{2}:\d{2}:\d{2}$/.test(hora)) return hora;
    if (/^\d{2}:\d{2}$/.test(hora)) return `${hora}:00`;
    const [h, m] = hora.split(':');
    return `${(h || '00').padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00`;
  };

  const confirmarComparecimento = async () => {
    if (!custodiado) { error('Erro', 'Nenhuma pessoa selecionada'); return; }
    if (!processoSelecionado) { error('Selecione um processo', 'É necessário selecionar o processo para registrar o comparecimento'); return; }
    if (!enderecoRespondido) { error('Atenção', 'Você precisa responder se houve mudança de endereço'); return; }
    if (atualizacaoEndereco.houveAlteracao) {
      const e = atualizacaoEndereco.endereco;
      if (!e?.cep || !e?.logradouro || !e?.bairro || !e?.cidade || !e?.estado) { error('Endereço incompleto', 'Preencha todos os campos obrigatórios'); return; }
      if (!atualizacaoEndereco.motivoAlteracao || atualizacaoEndereco.motivoAlteracao.trim().length < 10) { error('Motivo inválido', 'O motivo deve ter pelo menos 10 caracteres'); return; }
    }
    setEstado('buscando');
    setLoadingComparecimento(true);
    try {
      const data = normalizarDataParaEnvio(formulario.dataComparecimento);
      if (data.includes('T') || data.includes('Z')) { error('Erro de formato', 'Data inválida'); setEstado('inicial'); setLoadingComparecimento(false); return; }
      const tipoValidacaoValue = String(formulario.tipoValidacao).toLowerCase();
      const body: Record<string, any> = {
        processoId: processoSelecionado.id,
        dataComparecimento: data,
        horaComparecimento: formatarHora(formulario.horaComparecimento),
        tipoValidacao: tipoValidacaoValue,
        validadoPor: formulario.validadoPor.trim() || 'Sistema',
        mudancaEndereco: atualizacaoEndereco.houveAlteracao,
      };
      const custodiadoNumId = resolveNumericId(custodiado);
      if (custodiadoNumId > 0) body.custodiadoId = custodiadoNumId;
      if (formulario.observacoes?.trim()) body.observacoes = formulario.observacoes.trim();
      if (atualizacaoEndereco.motivoAlteracao) body.motivoMudancaEndereco = atualizacaoEndereco.motivoAlteracao;
      if (atualizacaoEndereco.houveAlteracao && atualizacaoEndereco.endereco) {
        body.novoEndereco = {
          cep: atualizacaoEndereco.endereco.cep,
          logradouro: atualizacaoEndereco.endereco.logradouro,
          numero: atualizacaoEndereco.endereco.numero,
          complemento: atualizacaoEndereco.endereco.complemento,
          bairro: atualizacaoEndereco.endereco.bairro,
          cidade: atualizacaoEndereco.endereco.cidade,
          estado: atualizacaoEndereco.endereco.estado,
        };
      }
      const result = await httpClient.post<any>('/comparecimentos/registrar', body);
      if (result.success) {
        setMensagem(`Comparecimento registrado com sucesso para ${custodiado.nome}`);
        setEstado('sucesso');
        await new Promise(r => setTimeout(r, 500));
        try { await refetch(); } catch { /* ignore */ }
        const custodiadoUuid = resolveCustodiadoUuid(custodiado, custodiados);
        if (custodiadoUuid) {
          setTimeout(() => router.push(`/dashboard/custodiados/${custodiadoUuid}?refresh=true`), 1500);
        } else {
          setTimeout(() => router.push('/dashboard/geral'), 1500);
        }
      } else {
        throw new Error(result.message || result.error || 'Erro ao registrar comparecimento');
      }
    } catch (err) {
      setEstado('erro');
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setMensagem(msg);
      error('Erro', msg);
    } finally {
      setLoadingComparecimento(false);
    }
  };

  const handleInputChange = (campo: keyof FormularioComparecimento, valor: string) => {
    setFormulario(prev => ({ ...prev, [campo]: valor }));
  };

  const handleEnderecoChange = (novo: Partial<Endereco>) => {
    setAtualizacaoEndereco(prev => ({ ...prev, endereco: { ...prev.endereco, ...novo } as Endereco }));
  };

  if (loadingCustodiados && !processoIdParam && !custodiadoIdParam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (errorCustodiados && !processoIdParam && !custodiadoIdParam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2"><XCircle className="w-5 h-5" />Erro ao carregar dados</h3>
          <p className="text-red-600 mb-4">{errorCustodiados}</p>
          <button onClick={() => refetch()} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  const mostrarFormularioCompleto = !!custodiado && !!processoSelecionado;
  const mostrarSeletorProcesso = !!custodiado && temMultiplosProcessos && !processoSelecionado;
  const mostrarAvisoSemProcesso = !!custodiado && processosDisponiveis.length === 0 && !processoSelecionado;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 md:p-6">

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Confirmar Comparecimento</h1>
            <p className="text-sm text-gray-500 mt-0.5">Registre o comparecimento de forma rápida e eficiente</p>
          </div>
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </div>

        {estado === 'sucesso' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-emerald-800 font-semibold text-lg mb-1">Sucesso!</h3>
                <p className="text-emerald-700 text-sm">{mensagem}</p>
                {proximoComparecimento && (
                  <div className="mt-3 bg-white rounded-lg p-3 border border-emerald-200">
                    <p className="text-xs text-gray-500 mb-0.5">Próximo comparecimento calculado:</p>
                    <p className="text-base font-semibold text-primary">{proximoComparecimento}</p>
                  </div>
                )}
                <p className="text-xs text-emerald-500 mt-3">Redirecionando...</p>
              </div>
            </div>
          </div>
        )}

        {estado === 'erro' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-1">Erro ao Registrar</h3>
                <p className="text-red-700 text-sm mb-3">{mensagem}</p>
                <button onClick={() => setEstado('inicial')} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">Tentar Novamente</button>
              </div>
            </div>
          </div>
        )}

        {estado !== 'sucesso' && (
          <div className="space-y-5">

            {!processoIdParam && !custodiadoIdParam && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Buscar Pessoa
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="text" value={buscaProcesso} onChange={(e) => setBuscaProcesso(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarPessoa()}
                        placeholder="Nome, CPF ou processo..."
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                    <button onClick={buscarPessoa} disabled={estado === 'buscando'}
                      className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium">
                      {estado === 'buscando' ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {mostrarResultados && resultadosBusca.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">{resultadosBusca.length} resultado(s):</p>
                      {resultadosBusca.map((p, i) => (
                        <button key={i} onClick={() => selecionarPessoa(p)}
                          className="w-full p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50/50 transition-all text-left">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{p.nome}</p>
                              <p className="text-xs text-gray-500">{p.processo} · CPF: {p.cpf || '—'}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {custodiado && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Pessoa Selecionada
                  </h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{custodiado.nome}</p>
                      <p className="text-xs text-gray-500">{custodiado.cpf || 'CPF não informado'} · {custodiado.rg || 'RG não informado'}</p>
                    </div>
                  </div>
                  {processoSelecionado && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Processo selecionado</p>
                        <p className="font-mono text-sm text-blue-900">{processoSelecionado.numeroProcesso}</p>
                        <p className="text-xs text-blue-700">{processoSelecionado.vara} · {processoSelecionado.comarca} · {formatarPeriodicidade(processoSelecionado.periodicidade)}</p>
                      </div>
                      {temMultiplosProcessos && (
                        <button onClick={trocarProcesso} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 flex-shrink-0 font-medium">
                          <RefreshCw className="w-3 h-3" />Trocar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mostrarSeletorProcesso && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-blue-100 bg-blue-50/50">
                  <h2 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Selecione o Processo
                  </h2>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Este custodiado possui {processosDisponiveis.length} processos ativos. Escolha para qual deseja registrar.
                  </p>
                </div>
                <div className="p-5">
                  <SeletorProcesso processos={processosDisponiveis} selecionado={processoSelecionado} onSelecionar={selecionarProcesso} />
                </div>
              </div>
            )}

            {mostrarAvisoSemProcesso && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-amber-800 font-semibold text-sm mb-1">Nenhum processo ativo</h3>
                  <p className="text-amber-700 text-xs">Este custodiado não possui processos ativos para registrar comparecimento.</p>
                </div>
              </div>
            )}

            {mostrarFormularioCompleto && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Verificação de Endereço
                    </h2>
                  </div>
                  <div className="p-5">
                    {!enderecoRespondido ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800 font-medium mb-2">O endereço cadastrado está correto?</p>
                          {custodiado?.endereco ? (
                            <div className="text-sm text-blue-700 space-y-0.5">
                              <p>{custodiado.endereco.logradouro}{custodiado.endereco.numero ? `, ${custodiado.endereco.numero}` : ''}</p>
                              <p>{custodiado.endereco.bairro} · {custodiado.endereco.cidade} - {custodiado.endereco.estado}</p>
                              <p>CEP: {custodiado.endereco.cep}</p>
                            </div>
                          ) : (<p className="text-sm text-blue-600 italic">Nenhum endereço cadastrado</p>)}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { setEnderecoRespondido(true); setAtualizacaoEndereco({ houveAlteracao: false }); }}
                            className="bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 font-medium flex items-center justify-center gap-2 text-sm transition-colors">
                            <CheckCircle className="w-4 h-4" />Sim, correto
                          </button>
                          <button onClick={() => { setEnderecoRespondido(true); setAtualizacaoEndereco({ houveAlteracao: true, endereco: custodiado?.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' } }); }}
                            className="bg-amber-500 text-white py-3 rounded-lg hover:bg-amber-600 font-medium flex items-center justify-center gap-2 text-sm transition-colors">
                            <AlertCircle className="w-4 h-4" />Houve mudança
                          </button>
                        </div>
                      </div>
                    ) : atualizacaoEndereco.houveAlteracao ? (
                      <div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <p className="text-amber-800 font-medium text-xs">Atualização de endereço necessária</p>
                        </div>
                        <EnderecoForm endereco={atualizacaoEndereco.endereco!} onEnderecoChange={handleEnderecoChange} />
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo da alteração *</label>
                          <textarea value={atualizacaoEndereco.motivoAlteracao || ''}
                            onChange={(e) => setAtualizacaoEndereco(prev => ({ ...prev, motivoAlteracao: e.target.value }))}
                            rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Mínimo 10 caracteres." minLength={10} maxLength={500} />
                        </div>
                        <button onClick={() => { setEnderecoRespondido(false); setAtualizacaoEndereco({ houveAlteracao: false }); }}
                          className="text-amber-600 hover:text-amber-800 underline text-xs mt-2">Alterar resposta</button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <p className="text-emerald-800 font-medium text-sm">Endereço confirmado</p>
                        </div>
                        <button onClick={() => { setEnderecoRespondido(false); setAtualizacaoEndereco({ houveAlteracao: false }); }}
                          className="text-emerald-600 hover:text-emerald-800 text-xs underline">Alterar</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Dados do Comparecimento
                    </h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo de Validação *</label>
                        <select value={formulario.tipoValidacao}
                          onChange={(e) => handleInputChange('tipoValidacao', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent">
                          <option value={TipoValidacao.PRESENCIAL}>Presencial</option>
                          <option value={TipoValidacao.ONLINE}>Balcão Virtual</option>
                          <option value={TipoValidacao.CADASTRO_INICIAL}>Cadastro Inicial</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Validado por *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                          <input type="text" value={formulario.validadoPor} readOnly
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Data *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                          <input type="date" value={formulario.dataComparecimento}
                            onChange={(e) => handleInputChange('dataComparecimento', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Horário *</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                          <input type="time" value={formulario.horaComparecimento}
                            onChange={(e) => handleInputChange('horaComparecimento', e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Observações</label>
                      <textarea value={formulario.observacoes}
                        onChange={(e) => handleInputChange('observacoes', e.target.value)}
                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Adicione observações opcionais..." />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 pb-20 md:pb-2">
                  <button onClick={() => router.back()}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors">
                    Cancelar
                  </button>
                  <button onClick={confirmarComparecimento} disabled={!podeConfirmar}
                    className="flex-1 sm:flex-none px-8 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {loadingComparecimento ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Confirmar Presença
                  </button>
                </div>
              </>
            )}

            {estado === 'inicial' && !custodiado && !processoIdParam && !custodiadoIdParam && (
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <h3 className="font-semibold text-sm mb-2 text-blue-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />Orientações
                </h3>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>• Certifique-se de que a pessoa realmente compareceu</p>
                  <p>• Sempre pergunte sobre mudança de endereço</p>
                  <p>• O próximo comparecimento será calculado automaticamente</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default withSearchParams(ConfirmarPresencaPage);
