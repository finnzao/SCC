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
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
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

interface MobileSectionProps {
  title: string;
  icon: LucideIcon;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
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
    <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-800">
          {selecionado ? 'Processo selecionado' : 'Selecione o processo para registrar comparecimento'}
        </h3>
      </div>
      {!selecionado && (
        <p className="text-sm text-blue-700 mb-3">
          Este custodiado possui {processos.length} processos ativos. Escolha para qual processo deseja registrar o comparecimento.
        </p>
      )}
      <div className="space-y-2">
        {processos.map(p => {
          const isSelected = selecionado?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelecionar(p)}
              className={`w-full text-left p-3 border-2 rounded-lg transition-all ${
                isSelected
                  ? 'border-primary bg-blue-50 ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-primary hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-mono font-medium text-gray-800 text-sm">{p.numeroProcesso}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{p.vara}</span>
                    <span>•</span>
                    <span>{p.comarca}</span>
                    <span className={p.status === 'EM_CONFORMIDADE' ? 'text-green-600' : 'text-red-600 font-medium'}>
                      {p.status === 'EM_CONFORMIDADE' ? 'Em Conformidade' : `Inadimplente${p.diasAtraso > 0 ? ` — ${p.diasAtraso} dias` : ''}`}
                    </span>
                  </div>
                  {p.periodicidadeDescricao && (
                    <p className="text-xs text-gray-400 mt-1">Periodicidade: {p.periodicidadeDescricao}</p>
                  )}
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('busca');
  const [proximoComparecimento, setProximoComparecimento] = useState<string | null>(null);
  const [buscaInicialFeita, setBuscaInicialFeita] = useState(false);

  const podeConfirmar = !!processoSelecionado && enderecoRespondido && !loadingComparecimento;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

          setExpandedSection('dados-pessoais');
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
        const ativos = await carregarProcessosAtivos(numId);
        if (ativos.length >= 1) {
          const fromProc = buildCustodiadoFromProcesso(ativos[0]);
          fromProc.id = numId;
          (fromProc as any).numericId = numId;
          const enriched = enrichWithListData(fromProc, custodiados, numId);
          setCustodiado(enriched);
          definirProcessos(ativos);
          setExpandedSection(ativos.length === 1 ? 'dados-pessoais' : 'busca');
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
        success('Resultados encontrados', `${encontrados.length} pessoa(s) encontrada(s)`);
      } else {
        error('Pessoa não encontrada', 'Nenhuma pessoa encontrada para o termo informado');
      }
    } catch {
      setEstado('inicial');
      error('Erro na busca', 'Ocorreu um erro ao buscar');
    }
  }, [buscaProcesso, custodiados, success, error, normalizarTexto]);

  const selecionarPessoa = useCallback(async (pessoa: CustodiadoData) => {
    setCustodiado(pessoa);
    setMostrarResultados(false);
    setProcessoSelecionado(null);
    setProcessosDisponiveis([]);
    setTemMultiplosProcessos(false);

    const numId = resolveNumericId(pessoa);
    if (numId > 0) {
      const ativos = await carregarProcessosAtivos(numId);
      definirProcessos(ativos);
      setExpandedSection(ativos.length === 1 ? 'dados-pessoais' : 'busca');
    } else {
      setExpandedSection('dados-pessoais');
    }
    success('Pessoa selecionada', `${pessoa.nome}`);
  }, [success, carregarProcessosAtivos, definirProcessos]);

  const selecionarProcesso = useCallback((proc: Processo) => {
    setProcessoSelecionado(proc);
    setExpandedSection('dados-pessoais');
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

      const body: Record<string, any> = {
        processoId: processoSelecionado.id,
        dataComparecimento: data,
        horaComparecimento: formatarHora(formulario.horaComparecimento),
        tipoValidacao: formulario.tipoValidacao,
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
        setTimeout(() => router.push('/dashboard/geral'), 1500);
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

  const MobileSection = ({ title, icon: Icon, isExpanded, onToggle, children }: MobileSectionProps) => (
    <div className="bg-white rounded-lg shadow-sm mb-3 overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-primary" /><span className="font-semibold text-gray-800">{title}</span></div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isExpanded && <div className="p-4 pt-0 border-t border-gray-100">{children}</div>}
    </div>
  );

  if (loadingCustodiados && !processoIdParam && !custodiadoIdParam) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div><p className="text-lg text-gray-600">Carregando dados...</p></div></div>);
  }

  if (errorCustodiados && !processoIdParam && !custodiadoIdParam) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md"><h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2"><XCircle className="w-5 h-5" />Erro ao carregar dados</h3><p className="text-red-600 mb-4">{errorCustodiados}</p><button onClick={() => refetch()} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Tentar Novamente</button></div></div>);
  }

  const renderProcessoInfo = () => {
    if (!processoSelecionado) return null;
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-600 font-medium">Processo selecionado</p>
            <p className="font-mono text-sm text-blue-900">{processoSelecionado.numeroProcesso}</p>
            <p className="text-xs text-blue-700">{processoSelecionado.vara} • {processoSelecionado.comarca} • {formatarPeriodicidade(processoSelecionado.periodicidade)}</p>
          </div>
          {temMultiplosProcessos && (
            <button onClick={trocarProcesso} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 flex-shrink-0">
              <RefreshCw className="w-3 h-3" />Trocar
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderBuscaSection = () => (
    <div className="space-y-3">
      <div className="relative">
        <input type="text" value={buscaProcesso} onChange={(e) => setBuscaProcesso(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarPessoa()} placeholder="Nome, CPF ou processo..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm" />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>
      <button onClick={buscarPessoa} disabled={estado === 'buscando'} className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">{estado === 'buscando' ? 'Buscando...' : 'Buscar'}</button>
      {mostrarResultados && resultadosBusca.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium text-gray-700">{resultadosBusca.length} resultado(s):</p>
          {resultadosBusca.map((p, i) => (
            <button key={i} onClick={() => selecionarPessoa(p)} className="w-full p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors text-left">
              <p className="font-medium text-gray-800">{p.nome}</p><p className="text-sm text-gray-600">{p.processo}</p><p className="text-xs text-gray-500">CPF: {p.cpf}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDadosPessoais = () => (
    <div className="space-y-3">
      {renderProcessoInfo()}
      <div><p className="text-xs text-gray-500">Nome</p><p className="font-medium text-gray-800">{custodiado?.nome}</p></div>
      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-xs text-gray-500">CPF</p><p className="font-medium text-gray-800">{custodiado?.cpf || 'Não informado'}</p></div>
        <div><p className="text-xs text-gray-500">RG</p><p className="font-medium text-gray-800">{custodiado?.rg || 'Não informado'}</p></div>
      </div>
      <div><p className="text-xs text-gray-500">Periodicidade</p><p className="font-medium text-gray-800">{formatarPeriodicidade(processoSelecionado?.periodicidade || custodiado?.periodicidade || 30)}</p></div>
    </div>
  );

  const renderEnderecoSection = () => {
    if (!enderecoRespondido) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-3 font-medium">O endereço cadastrado está correto?</p>
            {custodiado?.endereco ? (
              <div className="text-sm text-blue-700 space-y-1">
                <p>{custodiado.endereco.logradouro}{custodiado.endereco.numero ? `, ${custodiado.endereco.numero}` : ''}</p>
                <p>{custodiado.endereco.bairro}</p>
                <p>{custodiado.endereco.cidade} - {custodiado.endereco.estado}</p>
                <p>CEP: {custodiado.endereco.cep}</p>
              </div>
            ) : (<p className="text-sm text-blue-600 italic">Nenhum endereço cadastrado</p>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setEnderecoRespondido(true); setAtualizacaoEndereco({ houveAlteracao: false }); }} className="bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />Sim, correto</button>
            <button onClick={() => { setEnderecoRespondido(true); setAtualizacaoEndereco({ houveAlteracao: true, endereco: custodiado?.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' } }); }} className="bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2"><AlertCircle className="w-5 h-5" />Houve mudança</button>
          </div>
        </div>
      );
    }
    if (atualizacaoEndereco.houveAlteracao) {
      return (
        <div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4"><p className="text-orange-800 font-medium text-sm">Atualização de endereço necessária</p></div>
          <EnderecoForm endereco={atualizacaoEndereco.endereco!} onEnderecoChange={handleEnderecoChange} />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da alteração *</label>
            <textarea value={atualizacaoEndereco.motivoAlteracao || ''} onChange={(e) => setAtualizacaoEndereco(prev => ({ ...prev, motivoAlteracao: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Mínimo 10 caracteres." minLength={10} maxLength={500} />
          </div>
          <button onClick={() => { setEnderecoRespondido(false); setAtualizacaoEndereco({ houveAlteracao: false }); }} className="text-orange-600 hover:text-orange-800 underline text-sm mt-3">Alterar resposta</button>
        </div>
      );
    }
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600" /><p className="text-green-800 font-medium text-sm">Endereço confirmado</p></div>
        <button onClick={() => { setEnderecoRespondido(false); setAtualizacaoEndereco({ houveAlteracao: false }); }} className="text-green-600 hover:text-green-800 text-sm underline">Alterar resposta</button>
      </div>
    );
  };

  const renderFormComparecimento = () => (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Validação *</label><select value={formulario.tipoValidacao} onChange={(e) => handleInputChange('tipoValidacao', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value={TipoValidacao.PRESENCIAL}>Presencial</option><option value={TipoValidacao.ONLINE}>Balcão Virtual</option><option value={TipoValidacao.CADASTRO_INICIAL}>Cadastro Inicial</option></select></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Validado por *</label><div className="relative"><User className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="text" value={formulario.validadoPor} readOnly className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed" /></div></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Data *</label><div className="relative"><Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="date" value={formulario.dataComparecimento} onChange={(e) => handleInputChange('dataComparecimento', e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg" /></div></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Horário *</label><div className="relative"><Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" /><input type="time" value={formulario.horaComparecimento} onChange={(e) => handleInputChange('horaComparecimento', e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg" /></div></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-2">Observações</label><textarea value={formulario.observacoes} onChange={(e) => handleInputChange('observacoes', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Adicione observações..." /></div>
    </div>
  );

  const mostrarFormularioCompleto = !!custodiado && !!processoSelecionado;
  const mostrarSeletorProcesso = !!custodiado && temMultiplosProcessos && !processoSelecionado;
  const mostrarAvisoSemProcesso = !!custodiado && processosDisponiveis.length === 0 && !processoSelecionado;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Confirmar Comparecimento</h1>
          </div>
          <p className="text-gray-600 text-sm md:text-base ml-9 md:ml-0">Registre o comparecimento de forma rápida e eficiente</p>
        </div>

        {estado === 'sucesso' && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-green-800 font-semibold text-lg mb-2">Sucesso!</h3>
                <p className="text-green-700 mb-3">{mensagem}</p>
                {proximoComparecimento && (<div className="bg-white rounded-lg p-4 border border-green-200"><p className="text-sm text-gray-600 mb-1">Próximo comparecimento calculado:</p><p className="text-lg font-semibold text-primary">{proximoComparecimento}</p></div>)}
                <p className="text-sm text-green-600 mt-3">Redirecionando...</p>
              </div>
            </div>
          </div>
        )}

        {estado === 'erro' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold text-lg mb-2">Erro ao Registrar</h3>
                <p className="text-red-700 mb-4">{mensagem}</p>
                <button onClick={() => setEstado('inicial')} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Tentar Novamente</button>
              </div>
            </div>
          </div>
        )}

        {mostrarSeletorProcesso && (
          <SeletorProcesso processos={processosDisponiveis} selecionado={processoSelecionado} onSelecionar={selecionarProcesso} />
        )}

        {mostrarAvisoSemProcesso && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-800 font-semibold mb-1">Nenhum processo ativo</h3>
                <p className="text-yellow-700 text-sm">Este custodiado não possui processos ativos para registrar comparecimento.</p>
              </div>
            </div>
          </div>
        )}

        {isMobile && estado !== 'sucesso' && (
          <div className="space-y-3">
            {!processoIdParam && !custodiadoIdParam && (
              <MobileSection title="Buscar Pessoa" icon={Search} isExpanded={expandedSection === 'busca'} onToggle={() => setExpandedSection(expandedSection === 'busca' ? null : 'busca')}>
                {renderBuscaSection()}
              </MobileSection>
            )}
            {mostrarFormularioCompleto && (
              <>
                <MobileSection title="Dados Pessoais" icon={User} isExpanded={expandedSection === 'dados-pessoais'} onToggle={() => setExpandedSection(expandedSection === 'dados-pessoais' ? null : 'dados-pessoais')}>
                  {renderDadosPessoais()}
                </MobileSection>
                <MobileSection title="Verificação de Endereço" icon={MapPin} isExpanded={expandedSection === 'endereco'} onToggle={() => setExpandedSection(expandedSection === 'endereco' ? null : 'endereco')}>
                  {renderEnderecoSection()}
                </MobileSection>
                <MobileSection title="Dados do Comparecimento" icon={FileText} isExpanded={expandedSection === 'comparecimento'} onToggle={() => setExpandedSection(expandedSection === 'comparecimento' ? null : 'comparecimento')}>
                  {renderFormComparecimento()}
                </MobileSection>
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => router.back()} className="bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300">Cancelar</button>
                    <button onClick={confirmarComparecimento} disabled={!podeConfirmar} className="bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {loadingComparecimento ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Save className="w-5 h-5" />Confirmar</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!isMobile && estado !== 'sucesso' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-8">
              {!processoIdParam && !custodiadoIdParam && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-primary-dark flex items-center gap-2"><Search className="w-5 h-5" />Buscar Pessoa</h3>
                  <div className="flex gap-3">
                    <input type="text" value={buscaProcesso} onChange={(e) => setBuscaProcesso(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarPessoa()} placeholder="Digite o nome, CPF ou número do processo..." className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                    <button onClick={buscarPessoa} disabled={estado === 'buscando'} className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium flex items-center gap-2"><Search className="w-5 h-5" />{estado === 'buscando' ? 'Buscando...' : 'Buscar'}</button>
                  </div>
                  {mostrarResultados && resultadosBusca.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">{resultadosBusca.length} resultado(s):</p>
                      <div className="grid gap-3">
                        {resultadosBusca.map((p, i) => (
                          <button key={i} onClick={() => selecionarPessoa(p)} className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 text-left">
                            <div className="flex items-center justify-between"><div><p className="font-semibold text-gray-800 text-lg">{p.nome}</p><p className="text-gray-600">{p.processo}</p><p className="text-sm text-gray-500">CPF: {p.cpf}</p></div><UserCheck className="w-6 h-6 text-primary" /></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mostrarFormularioCompleto && (
                <>
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-xl font-semibold text-primary-dark mb-4 flex items-center gap-2"><User className="w-5 h-5" />Dados da Pessoa Selecionada</h3>
                    {renderProcessoInfo()}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
                      <div><p className="text-sm text-gray-500 mb-1">Nome Completo</p><p className="font-semibold text-gray-800">{custodiado?.nome}</p></div>
                      <div><p className="text-sm text-gray-500 mb-1">CPF</p><p className="font-semibold text-gray-800">{custodiado?.cpf || 'Não informado'}</p></div>
                      <div><p className="text-sm text-gray-500 mb-1">RG</p><p className="font-semibold text-gray-800">{custodiado?.rg || 'Não informado'}</p></div>
                      <div><p className="text-sm text-gray-500 mb-1">Vara</p><p className="font-semibold text-gray-800">{processoSelecionado?.vara || custodiado?.vara}</p></div>
                      <div><p className="text-sm text-gray-500 mb-1">Comarca</p><p className="font-semibold text-gray-800">{processoSelecionado?.comarca || custodiado?.comarca}</p></div>
                      <div><p className="text-sm text-gray-500 mb-1">Periodicidade</p><p className="font-semibold text-gray-800">{formatarPeriodicidade(processoSelecionado?.periodicidade || custodiado?.periodicidade || 30)}</p></div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-primary-dark flex items-center gap-2"><MapPin className="w-5 h-5" />Verificação de Endereço</h3>
                    {renderEnderecoSection()}
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-primary-dark flex items-center gap-2"><FileText className="w-5 h-5" />Registrar Comparecimento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderFormComparecimento()}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                    <button onClick={() => router.back()} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancelar</button>
                    <button onClick={confirmarComparecimento} disabled={!podeConfirmar} className="px-8 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed">
                      {loadingComparecimento ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
                      Confirmar Presença
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {estado === 'inicial' && !isMobile && (
          <div className="mt-6 bg-blue-50 rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Orientações Importantes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-blue-800">
                <li>• Certifique-se de que a pessoa realmente compareceu</li>
                <li>• Sempre pergunte sobre mudança de endereço</li>
                <li>• Registre o horário exato do atendimento</li>
              </ul>
              <ul className="space-y-2 text-blue-800">
                <li>• Esta ação atualiza automaticamente o status</li>
                <li>• O próximo comparecimento será calculado automaticamente</li>
                <li>• Todos os dados são sincronizados em tempo real</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withSearchParams(ConfirmarPresencaPage);
