/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, MapPin, Loader2, Info } from 'lucide-react';
import type { Comparecimento } from '@/types';
import { custodiadosService } from '@/lib/api/services';
import { useToast } from '@/components/Toast';
import { MaskedInputField } from '@/components/MaskedInput';
import {
  FormattingCPF,
  FormattingRG,
  FormattingPhone,
  FormattingCEP,
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

function isUUID(id: any): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
}

function limparContatoPendente(contato: string | null | undefined): string {
  if (!contato) return '';
  const limpo = contato.trim().toLowerCase();
  if (limpo === 'pendente' || limpo === 'pendente de cadastro') return '';
  return contato;
}

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
  const [dadosOriginais, setDadosOriginais] = useState<any>(null);

  const [custodiadoUuid, setCustodiadoUuid] = useState<string | null>(null);
  const [custodiadoNumericId, setCustodiadoNumericId] = useState<number | null>(null);

  const [form, setForm] = useState(() => {
    const contatoLimpo = limparContatoPendente(String(dados.contato || ''));
    const rgValue = rgTemConteudo(String(dados.rg || ''))
      ? FormattingRG(String(dados.rg || ''))
      : '';
    return {
      nome: String(dados.nome || ''),
      cpf: FormattingCPF(String(dados.cpf || '')),
      rg: rgValue,
      contato: contatoLimpo ? FormattingPhone(contatoLimpo) : '',
      observacoes: String((dados as any).observacoes || ''),
      endereco: dados.endereco || {
        cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', cidade: '', estado: ''
      }
    };
  });

  useEffect(() => {
    const carregarDadosCompletos = async () => {
      if (!dados.id) { setLoadingData(false); return; }
      setLoadingData(true);
      try {
        const rawId = dados.id;
        let custodiado: any = null;
        if (isUUID(rawId)) {
          setCustodiadoUuid(String(rawId));
          const resp = await httpClient.get<any>(`/custodiados/${rawId}`);
          if (resp.success) {
            custodiado = resp.data?.data || resp.data;
            if (custodiado?.numericId) setCustodiadoNumericId(custodiado.numericId);
          }
        } else {
          const numId = Number(rawId);
          if (!isNaN(numId) && numId > 0) setCustodiadoNumericId(numId);
          custodiado = null;
        }
        if (custodiado) {
          const contatoLimpo = limparContatoPendente(String(custodiado.contato || dados.contato || ''));
          const rgRaw = String(custodiado.rg || dados.rg || '');
          const rgValue = rgTemConteudo(rgRaw) ? FormattingRG(rgRaw) : '';
          const dadosCompletos = {
            nome: String(custodiado.nome || dados.nome || ''),
            cpf: FormattingCPF(String(custodiado.cpf || dados.cpf || '')),
            rg: rgValue,
            contato: contatoLimpo ? FormattingPhone(contatoLimpo) : '',
            observacoes: String(custodiado.observacoes || (dados as any).observacoes || ''),
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
          };
          setForm(dadosCompletos);
          setDadosOriginais(dadosCompletos);
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

  const verificarMudancas = (): boolean => {
    if (!dadosOriginais) return true;
    const n = (v: any): string => (v === null || v === undefined) ? '' : String(v).trim();
    const campos = ['nome', 'cpf', 'rg', 'contato', 'observacoes'];
    for (const c of campos) {
      if (n((form as any)[c]) !== n(dadosOriginais[c])) return true;
    }
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

    const cpfDigits = String(form.cpf || '').replace(/\D/g, '');
    const rgDigits = String(form.rg || '').replace(/\D/g, '').replace(/^0+$/, '');
    if (!cpfDigits && !rgDigits) e.documentos = 'Pelo menos CPF ou RG deve ser informado';
    if (cpfDigits && !ValidationCPF(String(form.cpf))) e.cpf = 'CPF inválido';

    const contatoDigits = String(form.contato || '').replace(/\D/g, '');
    if (contatoDigits.length > 0 && !ValidationPhone(String(form.contato))) {
      e.contato = 'Telefone inválido (10 ou 11 dígitos)';
    }

    if (form.endereco) {
      if (!form.endereco.cep?.trim()) e.cep = 'CEP é obrigatório';
      else if (!ValidationCEP(String(form.endereco.cep))) e.cep = 'CEP inválido';
      if (!form.endereco.logradouro?.trim()) e.logradouro = 'Logradouro é obrigatório';
      if (!form.endereco.bairro?.trim()) e.bairro = 'Bairro é obrigatório';
      if (!form.endereco.cidade?.trim()) e.cidade = 'Cidade é obrigatória';
      if (!form.endereco.estado?.trim()) e.estado = 'Estado é obrigatório';
      else if (!isValidEstado(form.endereco.estado.toUpperCase())) e.estado = 'UF inválida';
    }

    if (form.observacoes && form.observacoes.length > 500) e.observacoes = 'Máximo 500 caracteres';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
      const contatoDigits = String(form.contato || '').replace(/\D/g, '');
      const rgDigits = String(form.rg || '').replace(/\D/g, '');
      const rgReal = rgDigits && !/^0+$/.test(rgDigits) ? rgDigits : undefined;
      const cpfDigits = String(form.cpf || '').replace(/\D/g, '');

      const dadosAtualizacao: Record<string, any> = {
        nome: String(form.nome).trim(),
        observacoes: String(form.observacoes || '').trim(),
        cep: String(form.endereco?.cep || '').replace(/\D/g, ''),
        logradouro: String(form.endereco?.logradouro || '').trim(),
        numero: String(form.endereco?.numero || '').trim(),
        complemento: String(form.endereco?.complemento || '').trim(),
        bairro: String(form.endereco?.bairro || '').trim(),
        cidade: String(form.endereco?.cidade || '').trim(),
        estado: (String(form.endereco?.estado || 'BA').toUpperCase()) as EstadoBrasil
      };

      if (cpfDigits) dadosAtualizacao.cpf = cpfDigits;
      if (rgReal) dadosAtualizacao.rg = rgReal;
      if (contatoDigits) dadosAtualizacao.contato = contatoDigits;

      const idParaAtualizar = custodiadoUuid || custodiadoNumericId || dados.id;
      if (!idParaAtualizar) throw new Error('ID do custodiado inválido');

      const resultado = await custodiadosService.atualizar(idParaAtualizar as any, dadosAtualizacao);

      if (resultado.success) {
        showToast({ type: 'success', title: 'Sucesso', message: 'Dados atualizados com sucesso', duration: 3000 });
        onSave({ ...dados, nome: form.nome, cpf: form.cpf as any, rg: form.rg as any, contato: form.contato, endereco: form.endereco, observacoes: form.observacoes } as any);
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

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 overflow-y-auto">
      <form onSubmit={handleSubmit}
        className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">

        <div className="flex items-center justify-between mb-6 pb-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-primary-dark">Editar Dados Pessoais</h3>
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

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-gray-800">Dados Pessoais</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div></div>
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

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações <span className="text-gray-400 text-xs ml-2">({(form.observacoes || '').length}/500)</span>
          </label>
          <textarea className={`w-full border ${errors.observacoes ? 'border-red-500 bg-red-50' : 'border-gray-300'} p-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none`}
            value={form.observacoes || ''} onChange={(ev) => { if (errors.observacoes) setErrors(prev => { const n = { ...prev }; delete n.observacoes; return n; }); setForm(prev => ({ ...prev, observacoes: ev.target.value })); }}
            rows={3} maxLength={500} disabled={loading} placeholder="Informações adicionais" />
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${((form.observacoes || '').length / 500) * 100}%` }} />
          </div>
        </div>

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
