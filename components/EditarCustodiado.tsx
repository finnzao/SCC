/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, FileText, MapPin, Calendar, Hash, Loader2, Info } from 'lucide-react';
import type { Comparecimento } from '@/types';
import { custodiadosService } from '@/lib/api/services';
import { useToast } from '@/components/Toast';
import { MaskedInputField } from '@/components/MaskedInput';
import {
  FormattingCPF,
  FormattingRG,
  FormattingPhone,
  FormattingCEP,
  normalizarDataParaEnvio,
} from '@/lib/utils/formatting';
import {
  ValidationCPF,
  ValidationPhone,
  ValidationCEP,
  ValidationEstado as isValidEstado,
} from '@/lib/utils/validation';
import { EstadoBrasil } from '@/types/api';
import { httpClient } from '@/lib/http/client';

interface Props {
  dados: Comparecimento;
  onClose: () => void;
  onVoltar: () => void;
  onSave: (novo: Comparecimento) => void;
}

interface ValidationErrors {
  [key: string]: string;
}

const ESTADOS_BRASIL_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const formatProcessoCNJ = (processo: string): string => {
  if (!processo) return '';
  const numeros = processo.replace(/\D/g, '');
  if (numeros.length < 13) return numeros;
  const n = numeros.slice(0, 20);
  if (n.length >= 20) {
    return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`;
  } else if (n.length >= 13) {
    let f = `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}`;
    const resto = n.slice(13);
    if (resto.length >= 1) f += `.${resto.slice(0, 1)}`;
    if (resto.length >= 3) f += `.${resto.slice(1, 3)}`;
    else if (resto.length > 1) f += `.${resto.slice(1)}`;
    if (resto.length >= 7) f += `.${resto.slice(3, 7)}`;
    else if (resto.length > 3) f += `.${resto.slice(3)}`;
    return f;
  }
  return n;
};

const isValidProcessoCNJ = (processo: string): boolean => {
  if (!processo) return false;
  const numeros = processo.replace(/\D/g, '');
  if (numeros.length < 13 || numeros.length > 20) return false;
  if (numeros.length === 20) {
    try {
      const ano = parseInt(numeros.slice(9, 13));
      const anoAtual = new Date().getFullYear();
      if (ano < 1990 || ano > anoAtual + 2) return false;
      const segmento = parseInt(numeros.slice(13, 14));
      if (segmento < 1 || segmento > 9) return false;
      const tribunal = parseInt(numeros.slice(14, 16));
      if (tribunal < 1 || tribunal > 99) return false;
      return true;
    } catch { return false; }
  }
  return true;
};

/**
 * Detecta se um ID é UUID (string com hífens/letras hex).
 */
function isUUID(id: any): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
}

/**
 * Limpa contato "Pendente" do backend → campo vazio na edição.
 */
function limparContatoPendente(contato: string | null | undefined): string {
  if (!contato) return '';
  const limpo = contato.trim().toLowerCase();
  if (limpo === 'pendente' || limpo === 'pendente de cadastro') return '';
  return contato;
}

/**
 * Verifica se RG tem dígitos reais (não apenas zeros da máscara).
 */
function rgTemConteudo(rg: string | null | undefined): boolean {
  if (!rg) return false;
  const digits = String(rg).replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits)) return false;
  return digits.length > 0;
}

export default function EditarCustodiadoModal({ dados, onClose, onVoltar, onSave }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [dadosOriginais, setDadosOriginais] = useState<Comparecimento | null>(null);

  // Guardar UUID e numericId separadamente para usar nos endpoints corretos
  const [custodiadoUuid, setCustodiadoUuid] = useState<string | null>(null);
  const [custodiadoNumericId, setCustodiadoNumericId] = useState<number | null>(null);

  const [form, setForm] = useState<Comparecimento>(() => {
    const contatoLimpo = limparContatoPendente(String(dados.contato || ''));
    const rgValue = rgTemConteudo(String(dados.rg || ''))
      ? FormattingRG(String(dados.rg || ''))
      : '';

    return {
      ...dados,
      cpf: FormattingCPF(String(dados.cpf || '')),
      rg: rgValue,
      processo: formatProcessoCNJ(String(dados.processo)),
      contato: contatoLimpo ? FormattingPhone(contatoLimpo) : '',
      periodicidade: typeof dados.periodicidade === 'number'
        ? dados.periodicidade
        : parseInt(String(dados.periodicidade)) || 30,
      endereco: dados.endereco || {
        cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', cidade: '', estado: ''
      }
    };
  });

  const [periodicidadePersonalizada, setPeriodicidadePersonalizada] = useState(
    typeof dados.periodicidade === 'number' ? dados.periodicidade : 30
  );

  useEffect(() => {
    const carregarDadosCompletos = async () => {
      if (!dados.id) { setLoadingData(false); return; }

      setLoadingData(true);

      try {
        const rawId = dados.id;
        let custodiado: any = null;

        /**
         * REGRA DE ID (do guia do backend):
         * - GET /api/custodiados/{id} espera UUID (publicId)
         * - Se dados.id é UUID → chamar endpoint direto
         * - Se dados.id é numérico → NÃO pode usar no GET /custodiados/{id}
         *   porque causa "Custodiado não encontrado: 83"
         *   Nesse caso, usamos os dados já passados via props.
         */
        if (isUUID(rawId)) {
          setCustodiadoUuid(String(rawId));
          const resp = await httpClient.get<any>(`/custodiados/${rawId}`);
          if (resp.success) {
            custodiado = resp.data?.data || resp.data;
            if (custodiado?.numericId) setCustodiadoNumericId(custodiado.numericId);
          }
        } else {
          // ID é numérico — guardar e usar dados das props
          const numId = Number(rawId);
          if (!isNaN(numId) && numId > 0) {
            setCustodiadoNumericId(numId);
          }
          // Usar os dados que já vieram nas props
          custodiado = null;
        }

        if (custodiado) {
          const contatoLimpo = limparContatoPendente(
            String(custodiado.contato || dados.contato || '')
          );
          const rgRaw = String(custodiado.rg || dados.rg || '');
          const rgValue = rgTemConteudo(rgRaw) ? FormattingRG(rgRaw) : '';

          const dadosCompletos = {
            ...dados,
            ...custodiado,
            cpf: FormattingCPF(String(custodiado.cpf || dados.cpf || '')),
            rg: rgValue,
            processo: formatProcessoCNJ(String(custodiado.processo || dados.processo)),
            contato: contatoLimpo ? FormattingPhone(contatoLimpo) : '',
            decisao: formatDateForInput(custodiado.dataDecisao || dados.dataDecisao),
            dataComparecimentoInicial: formatDateForInput(
              custodiado.dataComparecimentoInicial || dados.dataComparecimentoInicial || dados.primeiroComparecimento
            ),
            primeiroComparecimento: formatDateForInput(dados.primeiroComparecimento),
            ultimoComparecimento: formatDateForInput(
              custodiado.ultimoComparecimento || dados.ultimoComparecimento
            ),
            proximoComparecimento: formatDateForInput(
              custodiado.proximoComparecimento || dados.proximoComparecimento
            ),
            periodicidade: typeof custodiado.periodicidade === 'number'
              ? custodiado.periodicidade
              : parseInt(String(custodiado.periodicidade)) || 30,
            endereco: custodiado.endereco ? {
              cep: FormattingCEP(String(custodiado.endereco.cep || '')),
              logradouro: String(custodiado.endereco.logradouro || ''),
              numero: String(custodiado.endereco.numero || ''),
              complemento: String(custodiado.endereco.complemento || ''),
              bairro: String(custodiado.endereco.bairro || ''),
              cidade: String(custodiado.endereco.cidade || ''),
              estado: String(custodiado.endereco.estado || '').toUpperCase()
            } : dados.endereco || {
              cep: '', logradouro: '', numero: '', complemento: '',
              bairro: '', cidade: '', estado: ''
            },
            observacoes: String(custodiado.observacoes || dados.observacoes || ''),
            status: (custodiado.status || dados.status) as any
          };

          setForm(dadosCompletos);
          setDadosOriginais(dadosCompletos);
          setPeriodicidadePersonalizada(
            typeof custodiado.periodicidade === 'number' ? custodiado.periodicidade : 30
          );
        } else {
          setDadosOriginais(form);
        }
      } catch (error) {
        console.error('[EditarCustodiado] Erro ao buscar dados:', error);
        setDadosOriginais(form);
      } finally {
        setLoadingData(false);
      }
    };

    carregarDadosCompletos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados.id]);

  function formatDateForInput(date: string | Date | null | undefined): string {
    if (!date) return '';
    try {
      if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        return dateObj.toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    } catch { return ''; }
  }

  const verificarMudancas = (): boolean => {
    if (!dadosOriginais) return true;
    const n = (v: any): string => (v === null || v === undefined) ? '' : String(v).trim();
    const campos = ['nome', 'cpf', 'rg', 'contato', 'processo', 'vara', 'comarca',
                    'decisao', 'ultimoComparecimento', 'proximoComparecimento', 'status', 'observacoes'];
    for (const c of campos) {
      if (n(form[c as keyof Comparecimento]) !== n(dadosOriginais[c as keyof Comparecimento])) return true;
    }
    if (periodicidadePersonalizada !== dadosOriginais.periodicidade) return true;
    if (form.endereco && dadosOriginais.endereco) {
      const ce = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
      for (const c of ce) {
        if (n(form.endereco[c as keyof typeof form.endereco]) !==
            n(dadosOriginais.endereco[c as keyof typeof dadosOriginais.endereco])) return true;
      }
    }
    return false;
  };

  const validateForm = (): boolean => {
    const e: ValidationErrors = {};

    if (!form.nome?.trim()) e.nome = 'Nome é obrigatório';
    else if (form.nome.trim().length < 2) e.nome = 'Mínimo 2 caracteres';
    else if (form.nome.trim().length > 150) e.nome = 'Máximo 150 caracteres';

    if (!form.processo?.trim()) {
      e.processo = 'Processo é obrigatório';
    } else {
      const pn = String(form.processo).replace(/\D/g, '');
      if (pn.length < 13) e.processo = 'Mínimo 13 dígitos';
      else if (pn.length > 20) e.processo = 'Máximo 20 dígitos';
      else if (pn.length === 20 && !isValidProcessoCNJ(String(form.processo))) {
        const ano = parseInt(pn.slice(9, 13));
        const anoAtual = new Date().getFullYear();
        if (ano < 1990 || ano > anoAtual + 2) e.processo = `Ano inválido: ${ano}`;
      }
    }

    // CPF OU RG obrigatório
    const cpfDigits = String(form.cpf || '').replace(/\D/g, '');
    const rgDigits = String(form.rg || '').replace(/\D/g, '').replace(/^0+$/, '');
    if (!cpfDigits && !rgDigits) e.documentos = 'Pelo menos CPF ou RG deve ser informado';
    if (cpfDigits && !ValidationCPF(String(form.cpf))) e.cpf = 'CPF inválido';

    // Contato é OPCIONAL — só valida se preenchido
    const contatoDigits = String(form.contato || '').replace(/\D/g, '');
    if (contatoDigits.length > 0 && !ValidationPhone(String(form.contato))) {
      e.contato = 'Telefone inválido (10 ou 11 dígitos)';
    }

    if (!form.vara?.trim()) e.vara = 'Vara é obrigatória';
    if (!form.comarca?.trim()) e.comarca = 'Comarca é obrigatória';
    if (!form.dataDecisao) e.decisao = 'Data da decisão é obrigatória';

    if (periodicidadePersonalizada < 1) e.periodicidade = 'Deve ser maior que zero';
    else if (periodicidadePersonalizada > 365) e.periodicidade = 'Máximo 365 dias';

    if (!form.status) e.status = 'Status é obrigatório';
    if (!form.ultimoComparecimento) e.ultimoComparecimento = 'Obrigatório';
    if (!form.proximoComparecimento) e.proximoComparecimento = 'Obrigatório';

    if (form.endereco) {
      if (!form.endereco.cep?.trim()) e.cep = 'CEP é obrigatório';
      else if (!ValidationCEP(String(form.endereco.cep))) e.cep = 'CEP inválido';
      if (!form.endereco.logradouro?.trim()) e.logradouro = 'Logradouro é obrigatório';
      if (!form.endereco.bairro?.trim()) e.bairro = 'Bairro é obrigatório';
      if (!form.endereco.cidade?.trim()) e.cidade = 'Cidade é obrigatória';
      if (!form.endereco.estado?.trim()) e.estado = 'Estado é obrigatório';
      else if (!isValidEstado(form.endereco.estado.toUpperCase())) e.estado = 'UF inválida';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Handlers ──────────────────────────────────────────────

  const handleMaskedChange = (field: string, value: string) => {
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    if ((field === 'cpf' || field === 'rg') && errors.documentos) {
      setErrors(prev => { const n = { ...prev }; delete n.documentos; return n; });
    }
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEnderecoMaskedChange = (field: string, value: string) => {
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: value } }));
    if (field === 'cep') {
      const cl = value.replace(/\D/g, '');
      if (cl.length === 8) buscarEnderecoPorCEP(value);
    }
  };

  function handleChange(ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = ev.target;
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleEnderecoChange(ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = ev.target;
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    let v = value;
    if (name === 'estado') v = value.toUpperCase().slice(0, 2);
    if (name === 'numero') v = value.slice(0, 20);
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [name]: v } }));
  }

  async function buscarEnderecoPorCEP(cep: string) {
    const cl = cep.replace(/\D/g, '');
    if (cl.length !== 8) return;
    try {
      setLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cl}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            cep: FormattingCEP(cl),
            logradouro: data.logradouro || prev.endereco.logradouro,
            bairro: data.bairro || prev.endereco.bairro,
            cidade: data.localidade || prev.endereco.cidade,
            estado: data.uf || prev.endereco.estado
          }
        }));
        setErrors(prev => {
          const n = { ...prev };
          delete n.logradouro; delete n.bairro; delete n.cidade; delete n.estado; delete n.cep;
          return n;
        });
        showToast({ type: 'success', title: 'CEP encontrado', message: 'Endereço preenchido', duration: 3000 });
      } else {
        showToast({ type: 'warning', title: 'CEP não encontrado', message: 'Preencha manualmente', duration: 3000 });
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodicidadeChange(value: string) {
    const num = parseInt(value.replace(/\D/g, '')) || 0;
    if (errors.periodicidade) setErrors(prev => { const n = { ...prev }; delete n.periodicidade; return n; });
    if (num > 365) { setErrors(prev => ({ ...prev, periodicidade: 'Máximo 365 dias' })); return; }
    setPeriodicidadePersonalizada(num);
    setForm(prev => ({ ...prev, periodicidade: num }));
  }

  // ─── Submit ────────────────────────────────────────────────

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();

    if (!validateForm()) {
      showToast({ type: 'error', title: 'Erro na validação', message: 'Verifique os campos destacados', duration: 5000 });
      return;
    }
    if (!verificarMudancas()) {
      showToast({ type: 'info', title: 'Nenhuma alteração', message: 'Não foram detectadas mudanças', duration: 3000 });
      return;
    }

    setLoading(true);

    try {
      const dataDecisaoNorm = normalizarDataParaEnvio(String(form.dataDecisao));
      const dataCompNorm = normalizarDataParaEnvio(
        String(form.dataComparecimentoInicial || form.dataDecisao)
      );

      const contatoDigits = String(form.contato || '').replace(/\D/g, '');
      const rgDigits = String(form.rg || '').replace(/\D/g, '');
      const rgReal = rgDigits && !/^0+$/.test(rgDigits) ? rgDigits : undefined;
      const cpfDigits = String(form.cpf || '').replace(/\D/g, '');

      const dadosAtualizacao: Record<string, any> = {
        nome: String(form.nome).trim(),
        processo: String(form.processo).replace(/\D/g, ''),
        vara: String(form.vara).trim(),
        comarca: String(form.comarca).trim(),
        dataDecisao: dataDecisaoNorm,
        periodicidade: periodicidadePersonalizada,
        dataComparecimentoInicial: dataCompNorm,
        observacoes: String(form.observacoes || '').trim(),
        cep: String(form.endereco?.cep || '').replace(/\D/g, ''),
        logradouro: String(form.endereco?.logradouro || '').trim(),
        numero: String(form.endereco?.numero || '').trim(),
        complemento: String(form.endereco?.complemento || '').trim(),
        bairro: String(form.endereco?.bairro || '').trim(),
        cidade: String(form.endereco?.cidade || '').trim(),
        estado: (String(form.endereco?.estado || 'BA').toUpperCase()) as EstadoBrasil
      };

      // Campos opcionais — só incluir se tiverem valor real
      if (cpfDigits) dadosAtualizacao.cpf = cpfDigits;
      if (rgReal) dadosAtualizacao.rg = rgReal;
      if (contatoDigits) dadosAtualizacao.contato = contatoDigits;

      /**
       * REGRA DE ID PARA ATUALIZAÇÃO:
       * Preferir UUID se disponível, senão usar numericId.
       */
      const idParaAtualizar = custodiadoUuid || custodiadoNumericId || dados.id;

      if (!idParaAtualizar) {
        throw new Error('ID do custodiado inválido');
      }

      console.log('[EditarCustodiado] PUT custodiados/', idParaAtualizar, dadosAtualizacao);

      const resultado = await custodiadosService.atualizar(idParaAtualizar as any, dadosAtualizacao);

      if (resultado.success) {
        showToast({ type: 'success', title: 'Sucesso', message: 'Dados atualizados com sucesso', duration: 3000 });
        onSave({ ...form, periodicidade: periodicidadePersonalizada });
        onClose();
      } else {
        throw new Error(resultado.message || 'Erro ao atualizar dados');
      }
    } catch (error: any) {
      console.error('[EditarCustodiado] Erro:', error);
      showToast({ type: 'error', title: 'Erro ao atualizar', message: error.message || 'Tente novamente.', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }

  // ─── Loading ───────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg text-gray-600">Carregando dados completos...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-primary-dark">Editar Dados do Custodiado</h3>
          <button onClick={onClose} type="button" disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50" aria-label="Fechar">
            <X size={24} />
          </button>
        </div>

        {errors.documentos && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.documentos}</p>
            </div>
          </div>
        )}

        {/* ═══ Dados Pessoais ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-gray-800">Dados Pessoais</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaskedInputField mask="nome" label="Nome" required
                value={form.nome || ''} onChange={(v) => handleMaskedChange('nome', v)}
                errorMessage={errors.nome} disabled={loading} showCounter />
            </div>

            <div>
              <MaskedInputField mask="telefone" label="Contato (Telefone)"
                value={String(form.contato || '')} onChange={(v) => handleMaskedChange('contato', v)}
                errorMessage={errors.contato} disabled={loading} />
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />Opcional. Se vazio, ficará como &quot;Pendente&quot;.
              </p>
            </div>

            <div>
              <MaskedInputField mask="cpf" label="CPF"
                value={String(form.cpf || '')} onChange={(v) => handleMaskedChange('cpf', v)}
                errorMessage={errors.cpf}
                helperText={String(form.cpf || '').replace(/\D/g, '').length === 11 && ValidationCPF(String(form.cpf)) ? '✓ CPF válido' : undefined}
                disabled={loading} />
            </div>

            <div>
              <MaskedInputField mask="rg" label="RG"
                value={String(form.rg || '')} onChange={(v) => handleMaskedChange('rg', v)}
                errorMessage={errors.rg} disabled={loading} />
            </div>
          </div>
        </div>

        {/* ═══ Dados Processuais ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-gray-800">Dados Processuais</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <MaskedInputField mask="processo" label="Número do Processo (CNJ)" required
                value={form.processo || ''} onChange={(v) => handleMaskedChange('processo', v)}
                errorMessage={errors.processo} helperText="Formato: 0000000-00.0000.0.00.0000"
                disabled={loading} showCounter />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Decisão <span className="text-red-500">*</span>
              </label>
              <input type="date"
                className={`w-full border ${errors.decisao ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="decisao" value={form.dataDecisao || ''} onChange={handleChange}
                disabled={loading} max={new Date().toISOString().split('T')[0]} />
              {errors.decisao && <p className="text-red-500 text-xs mt-1">{errors.decisao}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vara <span className="text-red-500">*</span></label>
              <input className={`w-full border ${errors.vara ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="vara" value={form.vara || ''} onChange={handleChange} disabled={loading}
                maxLength={100} placeholder="Ex: 1ª Vara Criminal" />
              {errors.vara && <p className="text-red-500 text-xs mt-1">{errors.vara}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comarca <span className="text-red-500">*</span></label>
              <input className={`w-full border ${errors.comarca ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="comarca" value={form.comarca || ''} onChange={handleChange} disabled={loading}
                maxLength={100} placeholder="Ex: Salvador" />
              {errors.comarca && <p className="text-red-500 text-xs mt-1">{errors.comarca}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
              <select className={`w-full border ${errors.status ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="status" value={form.status || ''} onChange={handleChange} disabled={loading}>
                <option value="">Selecione</option>
                <option value="em conformidade">Em Conformidade</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
              {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
            </div>
          </div>
        </div>

        {/* ═══ Periodicidade e Datas ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-gray-800">Periodicidade e Datas</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 inline mr-1" />Periodicidade (dias) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" max="365"
                className={`w-full border ${errors.periodicidade ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                value={periodicidadePersonalizada} onChange={(e) => handlePeriodicidadeChange(e.target.value)}
                disabled={loading} placeholder="Ex: 30" />
              {errors.periodicidade && <p className="text-red-500 text-xs mt-1">{errors.periodicidade}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Último Comparecimento <span className="text-red-500">*</span></label>
              <input type="date" className={`w-full border ${errors.ultimoComparecimento ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="ultimoComparecimento" value={form.ultimoComparecimento || ''} onChange={handleChange}
                disabled={loading} max={new Date().toISOString().split('T')[0]} />
              {errors.ultimoComparecimento && <p className="text-red-500 text-xs mt-1">{errors.ultimoComparecimento}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Comparecimento <span className="text-red-500">*</span></label>
              <input type="date" className={`w-full border ${errors.proximoComparecimento ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="proximoComparecimento" value={form.proximoComparecimento || ''} onChange={handleChange} disabled={loading} />
              {errors.proximoComparecimento && <p className="text-red-500 text-xs mt-1">{errors.proximoComparecimento}</p>}
            </div>
          </div>
        </div>

        {/* ═══ Endereço ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-gray-800">Endereço</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <MaskedInputField mask="cep" label="CEP" required
                value={form.endereco?.cep || ''} onChange={(v) => handleEnderecoMaskedChange('cep', v)}
                errorMessage={errors.cep} disabled={loading} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro <span className="text-red-500">*</span></label>
              <input className={`w-full border ${errors.logradouro ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="logradouro" value={form.endereco?.logradouro || ''} onChange={handleEnderecoChange}
                disabled={loading} maxLength={200} placeholder="Ex: Rua das Flores" />
              {errors.logradouro && <p className="text-red-500 text-xs mt-1">{errors.logradouro}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                name="numero" value={form.endereco?.numero || ''} onChange={handleEnderecoChange}
                disabled={loading} maxLength={20} placeholder="S/N" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                name="complemento" value={form.endereco?.complemento || ''} onChange={handleEnderecoChange}
                disabled={loading} maxLength={100} placeholder="Ex: Apto 101" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro <span className="text-red-500">*</span></label>
              <input className={`w-full border ${errors.bairro ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="bairro" value={form.endereco?.bairro || ''} onChange={handleEnderecoChange}
                disabled={loading} maxLength={100} placeholder="Ex: Centro" />
              {errors.bairro && <p className="text-red-500 text-xs mt-1">{errors.bairro}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade <span className="text-red-500">*</span></label>
              <input className={`w-full border ${errors.cidade ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="cidade" value={form.endereco?.cidade || ''} onChange={handleEnderecoChange}
                disabled={loading} maxLength={100} placeholder="Ex: Salvador" />
              {errors.cidade && <p className="text-red-500 text-xs mt-1">{errors.cidade}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF) <span className="text-red-500">*</span></label>
              <select className={`w-full border ${errors.estado ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                name="estado" value={form.endereco?.estado || ''} onChange={handleEnderecoChange} disabled={loading}>
                <option value="">Selecione</option>
                {ESTADOS_BRASIL_LIST.map(uf => (<option key={uf} value={uf}>{uf}</option>))}
              </select>
              {errors.estado && <p className="text-red-500 text-xs mt-1">{errors.estado}</p>}
            </div>
          </div>
        </div>

        {/* ═══ Observações ═══ */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações <span className="text-gray-400 text-xs ml-2">({(form.observacoes || '').length}/500)</span>
          </label>
          <textarea className={`w-full border ${errors.observacoes ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none`}
            name="observacoes" value={form.observacoes || ''} onChange={handleChange}
            rows={3} maxLength={500} disabled={loading} placeholder="Informações adicionais" />
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${((form.observacoes || '').length / 500) * 100}%` }} />
          </div>
        </div>

        {/* ═══ Botões ═══ */}
        <div className="pt-4 flex justify-between border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onVoltar} disabled={loading}
            className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium">
            Voltar
          </button>
          <button type="submit" disabled={loading}
            className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2 font-medium">
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Salvando...</>
            ) : (
              <><Save className="w-4 h-4" />Salvar Alterações</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}