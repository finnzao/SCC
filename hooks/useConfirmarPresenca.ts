/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCustodiados } from '@/hooks/useAPI';
import { CustodiadoData, TipoValidacao } from '@/types/api';
import type { Processo } from '@/types/processo';
import { useToastHelpers } from '@/components/Toast';
import { calcularProximoComparecimento, formatarPeriodicidade } from '@/lib/utils/periodicidade';
import {
  FormularioComparecimento,
  AtualizacaoEndereco,
  EstadoPagina,
  dateUtils,
  Endereco,
} from '@/types/comparecimento';
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

interface UseConfirmarPresencaParams {
  processoParam: string | null;
  processoIdParam: string | null;
  custodiadoIdParam: string | null;
}

export function useConfirmarPresenca({ processoParam, processoIdParam, custodiadoIdParam }: UseConfirmarPresencaParams) {
  const router = useRouter();
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
    validadoPor: '',
  });
  const [atualizacaoEndereco, setAtualizacaoEndereco] = useState<AtualizacaoEndereco>({ houveAlteracao: false });
  const [enderecoRespondido, setEnderecoRespondido] = useState(false);
  const [proximoComparecimento, setProximoComparecimento] = useState<string | null>(null);
  const [buscaInicialFeita, setBuscaInicialFeita] = useState(false);

  const currentStep = !custodiado ? 0 : !processoSelecionado && temMultiplosProcessos ? 1 : !enderecoRespondido ? 2 : 3;
  const podeConfirmar = !!processoSelecionado && enderecoRespondido && !loadingComparecimento;
  const mostrarFormularioCompleto = !!custodiado && !!processoSelecionado;
  const mostrarSeletorProcesso = !!custodiado && temMultiplosProcessos && !processoSelecionado;
  const mostrarAvisoSemProcesso = !!custodiado && processosDisponiveis.length === 0 && !processoSelecionado;

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
      } catch {
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

  const confirmarEnderecoCorreto = () => {
    setEnderecoRespondido(true);
    setAtualizacaoEndereco({ houveAlteracao: false });
  };

  const indicarMudancaEndereco = () => {
    setEnderecoRespondido(true);
    setAtualizacaoEndereco({
      houveAlteracao: true,
      endereco: custodiado?.endereco || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
    });
  };

  const resetarRespostaEndereco = () => {
    setEnderecoRespondido(false);
    setAtualizacaoEndereco({ houveAlteracao: false });
  };

  const setMotivoAlteracao = (motivo: string) => {
    setAtualizacaoEndereco(prev => ({ ...prev, motivoAlteracao: motivo }));
  };

  return {
    loadingCustodiados,
    loadingComparecimento,
    errorCustodiados,
    custodiado,
    estado,
    setEstado,
    mensagem,
    buscaProcesso,
    setBuscaProcesso,
    resultadosBusca,
    mostrarResultados,
    nomeUsuarioLogado,
    processoSelecionado,
    processosDisponiveis,
    temMultiplosProcessos,
    formulario,
    atualizacaoEndereco,
    enderecoRespondido,
    proximoComparecimento,
    currentStep,
    podeConfirmar,
    mostrarFormularioCompleto,
    mostrarSeletorProcesso,
    mostrarAvisoSemProcesso,
    processoIdParam,
    custodiadoIdParam,
    refetch,
    buscarPessoa,
    selecionarPessoa,
    selecionarProcesso,
    trocarProcesso,
    confirmarComparecimento,
    handleInputChange,
    handleEnderecoChange,
    confirmarEnderecoCorreto,
    indicarMudancaEndereco,
    resetarRespostaEndereco,
    setMotivoAlteracao,
    formatarPeriodicidade,
    router,
  };
}
