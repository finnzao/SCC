/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions, useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/PermissionGuard';
import { httpClient } from '@/lib/http/client';
import {
  Lock,
  ArrowLeft,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Info,
  User,
  FileText,
  MapPin,
  Calendar,
  Hash,
  MessageSquare,
  Loader2,
  Check
} from 'lucide-react';
import { MaskedInputField } from '@/components/MaskedInput';
import { useToast } from '@/components/Toast';
import {
  ValidationCPF as isValidCPF,
  ValidationPhone as isValidPhone,
  ValidationCEP as isValidCEP,
  ValidationEstado as isValidEstado
} from '@/lib/utils/validation';
import { normalizarDataParaEnvio } from '@/lib/utils/formatting';

// ─── Constants ───────────────────────────────────────────────

const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const PERIODICIDADE_OPTIONS = [
  { valor: 7, label: 'Semanal (7 dias)' },
  { valor: 15, label: 'Quinzenal (15 dias)' },
  { valor: 30, label: 'Mensal (30 dias)' },
  { valor: 60, label: 'Bimestral (60 dias)' },
  { valor: 90, label: 'Trimestral (90 dias)' },
  { valor: 180, label: 'Semestral (180 dias)' },
];

// ─── Form shape ──────────────────────────────────────────────

interface CadastroInicialForm {
  nome: string;
  contato: string;
  cpf: string;
  rg: string;
  processo: string;
  vara: string;
  comarca: string;
  dataDecisao: string;
  dataComparecimentoInicial: string;
  periodicidade: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacoes: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, number }: { icon: React.ElementType; title: string; number: number }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex-shrink-0">{number}</div>
      <Icon className="w-5 h-5 text-primary flex-shrink-0" />
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

function DocumentStatusBanner({ cpf, rg }: { cpf: string; rg: string }) {
  const hasCpf = cpf.replace(/\D/g, '').length > 0;
  const hasRg = rg.trim().length > 0;
  if (hasCpf || hasRg) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800">
          {hasCpf && hasRg ? 'CPF e RG informados' : hasCpf ? 'CPF informado' : 'RG informado'} — requisito de documento atendido.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-800">Nenhum documento informado. Preencha pelo menos o CPF ou o RG.</p>
    </div>
  );
}

function ProgressIndicator({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Campos obrigatórios</span>
        <span className="text-sm text-gray-600">{filled}/{total} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

function RegistrarPage() {
  const router = useRouter();
  const { logAction } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<CadastroInicialForm>({
    nome: '', contato: '', cpf: '', rg: '',
    processo: '', vara: '', comarca: '',
    dataDecisao: '', dataComparecimentoInicial: '',
    periodicidade: 30,
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: 'BA',
    observacoes: ''
  });

  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodicidadeCustomizada, setPeriodicidadeCustomizada] = useState(false);
  const [diasCustomizados, setDiasCustomizados] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEncontrado, setCepEncontrado] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const today = new Date().toISOString().split('T')[0];

  // ─── ViaCEP ────────────────────────────────────────────────

  const buscarCep = useCallback(async (cep: string) => {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    setCepEncontrado(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setCepEncontrado(true);
        setErrors(prev => {
          const n = { ...prev };
          delete n.logradouro; delete n.bairro; delete n.cidade; delete n.estado; delete n.cep;
          return n;
        });
      }
    } catch { /* user fills manually */ }
    finally { setBuscandoCep(false); }
  }, []);

  useEffect(() => {
    const limpo = formData.cep.replace(/\D/g, '');
    if (limpo.length === 8) buscarCep(formData.cep);
    else setCepEncontrado(false);
  }, [formData.cep, buscarCep]);

  // ─── Validation ────────────────────────────────────────────

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};

    if (!formData.nome.trim()) e.nome = 'Nome é obrigatório';
    else if (formData.nome.trim().length < 2) e.nome = 'Mínimo 2 caracteres';
    else if (formData.nome.trim().length > 150) e.nome = 'Máximo 150 caracteres';

    const contatoDigits = formData.contato.replace(/\D/g, '');
    if (contatoDigits.length > 0 && !isValidPhone(formData.contato)) e.contato = 'Telefone inválido (10 ou 11 dígitos)';

    const cpfDigits = formData.cpf.replace(/\D/g, '');
    const rgVal = formData.rg.trim();
    if (!cpfDigits && !rgVal) e.documentos = 'Pelo menos CPF ou RG deve ser informado';
    if (cpfDigits && !isValidCPF(formData.cpf)) e.cpf = 'CPF inválido (dígitos verificadores)';
    if (rgVal && rgVal.length > 20) e.rg = 'RG deve ter no máximo 20 caracteres';

    const procDigits = formData.processo.replace(/\D/g, '');
    if (!formData.processo.trim()) e.processo = 'Processo é obrigatório';
    else if (procDigits.length !== 20) e.processo = 'Deve ter 20 dígitos (formato CNJ)';

    if (!formData.vara.trim()) e.vara = 'Vara é obrigatória';
    else if (formData.vara.trim().length > 100) e.vara = 'Máximo 100 caracteres';

    if (!formData.comarca.trim()) e.comarca = 'Comarca é obrigatória';
    else if (formData.comarca.trim().length > 100) e.comarca = 'Máximo 100 caracteres';

    if (!formData.dataDecisao) e.dataDecisao = 'Data da decisão é obrigatória';
    else if (formData.dataDecisao > today) e.dataDecisao = 'Não pode ser futura';

    if (formData.dataComparecimentoInicial && formData.dataDecisao && formData.dataComparecimentoInicial < formData.dataDecisao) {
      e.dataComparecimentoInicial = 'Não pode ser anterior à data da decisão';
    }

    if (formData.periodicidade < 1 || formData.periodicidade > 365) e.periodicidade = 'Entre 1 e 365 dias';

    if (!formData.cep.trim()) e.cep = 'CEP é obrigatório';
    else if (!isValidCEP(formData.cep)) e.cep = 'CEP inválido (8 dígitos)';

    if (!formData.logradouro.trim()) e.logradouro = 'Logradouro é obrigatório';
    else if (formData.logradouro.trim().length < 5) e.logradouro = 'Mínimo 5 caracteres';
    else if (formData.logradouro.trim().length > 200) e.logradouro = 'Máximo 200 caracteres';

    if (!formData.bairro.trim()) e.bairro = 'Bairro é obrigatório';
    else if (formData.bairro.trim().length < 2) e.bairro = 'Mínimo 2 caracteres';

    if (!formData.cidade.trim()) e.cidade = 'Cidade é obrigatória';
    else if (formData.cidade.trim().length < 2) e.cidade = 'Mínimo 2 caracteres';

    if (!formData.estado.trim()) e.estado = 'Estado é obrigatório';
    else if (!isValidEstado(formData.estado.toUpperCase())) e.estado = 'UF inválida';

    if (formData.observacoes.length > 500) e.observacoes = 'Máximo 500 caracteres';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Progress ──────────────────────────────────────────────

  const requiredFields = [
    { filled: formData.nome.trim().length >= 2 },
    { filled: !!(formData.cpf.replace(/\D/g, '') || formData.rg.trim()) },
    { filled: formData.processo.replace(/\D/g, '').length === 20 },
    { filled: !!formData.vara.trim() },
    { filled: !!formData.comarca.trim() },
    { filled: !!formData.dataDecisao },
    { filled: formData.periodicidade >= 1 && formData.periodicidade <= 365 },
    { filled: formData.cep.replace(/\D/g, '').length === 8 },
    { filled: formData.logradouro.trim().length >= 5 },
    { filled: formData.bairro.trim().length >= 2 },
    { filled: formData.cidade.trim().length >= 2 },
    { filled: isValidEstado(formData.estado.toUpperCase()) },
  ];
  const filledCount = requiredFields.filter(f => f.filled).length;
  const allFilled = filledCount === requiredFields.length;

  // ─── Submit ────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      showToast({ type: 'warning', title: 'Campos inválidos', message: 'Corrija os erros antes de continuar', duration: 4000 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const body: Record<string, any> = {
        nome: formData.nome.trim(),
        processo: formData.processo.trim(),
        vara: formData.vara.trim(),
        comarca: formData.comarca.trim(),
        dataDecisao: normalizarDataParaEnvio(formData.dataDecisao),
        periodicidade: formData.periodicidade,
        cep: formData.cep.trim(),
        logradouro: formData.logradouro.trim(),
        bairro: formData.bairro.trim(),
        cidade: formData.cidade.trim(),
        estado: formData.estado.trim().toUpperCase(),
      };

      if (formData.contato.trim()) body.contato = formData.contato.trim();
      if (formData.cpf.trim()) body.cpf = formData.cpf.trim();
      if (formData.rg.trim()) body.rg = formData.rg.trim();
      if (formData.dataComparecimentoInicial) body.dataComparecimentoInicial = normalizarDataParaEnvio(formData.dataComparecimentoInicial);
      if (formData.numero.trim()) body.numero = formData.numero.trim();
      if (formData.complemento.trim()) body.complemento = formData.complemento.trim();
      if (formData.observacoes.trim()) body.observacoes = formData.observacoes.trim();

      const result = await httpClient.post<any>('/custodiados/cadastro-inicial', body);

      if (result.success) {
        const data = result.data?.data || result.data;
        logAction('create', 'custodiado', { processo: body.processo, nome: body.nome, custodiadoId: data?.custodiadoId, success: true });
        setSuccessData(data);
        setSuccessState(true);
        showToast({ type: 'success', title: 'Cadastro realizado!', message: 'Custodiado, processo e endereço cadastrados com sucesso.', duration: 3000 });
        setTimeout(() => router.push('/dashboard/geral'), 2500);
      } else {
        const msg = result.message || result.error || 'Erro desconhecido ao cadastrar';
        logAction('create_failed', 'custodiado', { processo: body.processo, error: msg });
        showToast({ type: 'error', title: 'Erro no cadastro', message: msg, duration: 6000 });
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Erro inesperado', message: err instanceof Error ? err.message : 'Erro interno', duration: 6000 });
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers ──────────────────────────────────────────────

  const handleInputChange = (field: keyof CadastroInicialForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleDocumentChange = (field: 'cpf' | 'rg', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.documentos) {
      const other = field === 'cpf' ? formData.rg : formData.cpf;
      if (value.replace(/\D/g, '').length > 0 || value.trim().length > 0 || other.replace(/\D/g, '').length > 0 || other.trim().length > 0) {
        setErrors(prev => { const n = { ...prev }; delete n.documentos; return n; });
      }
    }
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handlePeriodicidadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'custom') { setPeriodicidadeCustomizada(true); setDiasCustomizados(''); }
    else { setPeriodicidadeCustomizada(false); handleInputChange('periodicidade', parseInt(e.target.value)); }
  };

  // ─── Success Screen ────────────────────────────────────────

  if (successState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-green-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-3">Cadastro Realizado!</h1>
          <p className="text-green-700 mb-6">Todos os dados foram salvos em uma única transação.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 space-y-2">
            <p className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Custodiado criado</p>
            <p className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Processo vinculado</p>
            <p className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Endereço registrado</p>
            <p className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Comparecimento inicial gerado</p>
          </div>
          {successData?.proximoComparecimento && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">Próximo comparecimento: <strong>{successData.proximoComparecimento}</strong></p>
            </div>
          )}
          {successData?.contatoPendente && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">Contato ficou como &quot;Pendente&quot;. Atualize quando disponível.</p>
            </div>
          )}
          <p className="text-xs text-green-500 mt-4">Redirecionando para a lista geral...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-8">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cadastrar Custodiado</h1>
            <p className="text-gray-500 text-sm mt-1">Preencha os campos obrigatórios marcados com *</p>
          </div>
        </div>
        <div className="mt-4"><ProgressIndicator filled={filledCount} total={requiredFields.length} /></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ═══ 1. DADOS PESSOAIS ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <SectionHeader icon={User} title="Dados Pessoais" number={1} />
          <div className="space-y-4">
            <MaskedInputField mask="nome" label="Nome Completo" required value={formData.nome} onChange={(v) => handleInputChange('nome', v)} errorMessage={errors.nome} disabled={isSubmitting} showCounter />
            <div>
              <MaskedInputField mask="telefone" label="Contato (Telefone)" value={formData.contato} onChange={(v) => handleInputChange('contato', v)} errorMessage={errors.contato} disabled={isSubmitting} />
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" />Opcional. Se não informado, ficará como &quot;Pendente&quot;.</p>
            </div>
          </div>
        </div>

        {/* ═══ 2. DOCUMENTOS ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <SectionHeader icon={FileText} title="Documentos" number={2} />
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">Pelo menos <strong>CPF ou RG</strong> deve ser informado.</p>
            </div>
          </div>
          {errors.documentos && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" /><p className="text-sm text-red-800">{errors.documentos}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <MaskedInputField mask="cpf" label="CPF" value={formData.cpf} onChange={(v) => handleDocumentChange('cpf', v)} errorMessage={errors.cpf} helperText={formData.cpf && isValidCPF(formData.cpf) ? '✓ CPF válido' : undefined} disabled={isSubmitting} />
            <MaskedInputField mask="rg" label="RG" value={formData.rg} onChange={(v) => handleDocumentChange('rg', v)} errorMessage={errors.rg} disabled={isSubmitting} />
          </div>
          <DocumentStatusBanner cpf={formData.cpf} rg={formData.rg} />
        </div>

        {/* ═══ 3. DADOS PROCESSUAIS ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <SectionHeader icon={Calendar} title="Dados Processuais" number={3} />
          <div className="space-y-4">
            <MaskedInputField mask="processo" label="Número do Processo (CNJ)" required value={formData.processo} onChange={(v) => handleInputChange('processo', v)} errorMessage={errors.processo} helperText="Formato: 0000000-00.0000.0.00.0000" disabled={isSubmitting} showCounter />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vara <span className="text-red-500">*</span></label>
                <input type="text" value={formData.vara} onChange={(e) => handleInputChange('vara', e.target.value.slice(0, 100))} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.vara ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} placeholder="Ex: 1ª Vara Criminal" maxLength={100} disabled={isSubmitting} />
                {errors.vara && <p className="text-red-500 text-sm mt-1">{errors.vara}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comarca <span className="text-red-500">*</span></label>
                <input type="text" value={formData.comarca} onChange={(e) => handleInputChange('comarca', e.target.value.slice(0, 100))} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.comarca ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} placeholder="Ex: Salvador" maxLength={100} disabled={isSubmitting} />
                {errors.comarca && <p className="text-red-500 text-sm mt-1">{errors.comarca}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Decisão <span className="text-red-500">*</span></label>
                <input type="date" value={formData.dataDecisao} onChange={(e) => handleInputChange('dataDecisao', e.target.value)} max={today} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.dataDecisao ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} disabled={isSubmitting} />
                {errors.dataDecisao && <p className="text-red-500 text-sm mt-1">{errors.dataDecisao}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Primeiro Comparecimento</label>
                <input type="date" value={formData.dataComparecimentoInicial} onChange={(e) => handleInputChange('dataComparecimentoInicial', e.target.value)} min={formData.dataDecisao || undefined} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.dataComparecimentoInicial ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} disabled={isSubmitting} />
                {errors.dataComparecimentoInicial && <p className="text-red-500 text-sm mt-1">{errors.dataComparecimentoInicial}</p>}
                <p className="text-xs text-gray-500 mt-1">Opcional. Se não informada, o sistema usa a data de hoje.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 4. PERIODICIDADE ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <SectionHeader icon={Hash} title="Periodicidade" number={4} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequência de Comparecimento <span className="text-red-500">*</span></label>
            {!periodicidadeCustomizada ? (
              <select value={formData.periodicidade.toString()} onChange={handlePeriodicidadeChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" disabled={isSubmitting}>
                {PERIODICIDADE_OPTIONS.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                <option value="custom">Personalizada...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <MaskedInputField mask="periodicidade" label="" value={diasCustomizados} onChange={(v) => { setDiasCustomizados(v); handleInputChange('periodicidade', Math.min(365, Math.max(1, parseInt(v) || 30))); }} errorMessage={errors.periodicidade} helperText="Entre 1 e 365 dias" disabled={isSubmitting} />
                <button type="button" onClick={() => { setPeriodicidadeCustomizada(false); handleInputChange('periodicidade', 30); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 h-fit">Padrão</button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ 5. ENDEREÇO ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <SectionHeader icon={MapPin} title="Endereço" number={5} />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MaskedInputField mask="cep" label="" value={formData.cep} onChange={(v) => handleInputChange('cep', v)} errorMessage={errors.cep} disabled={isSubmitting} />
                  {buscandoCep && <div className="absolute right-3 top-3"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
                </div>
                {cepEncontrado && <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Endereço preenchido</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro <span className="text-red-500">*</span></label>
                <input type="text" value={formData.logradouro} onChange={(e) => handleInputChange('logradouro', e.target.value.slice(0, 200))} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.logradouro ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} placeholder="Rua, Avenida..." maxLength={200} disabled={isSubmitting} />
                {errors.logradouro && <p className="text-red-500 text-sm mt-1">{errors.logradouro}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" value={formData.numero} onChange={(e) => handleInputChange('numero', e.target.value.slice(0, 20))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="S/N" maxLength={20} disabled={isSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input type="text" value={formData.complemento} onChange={(e) => handleInputChange('complemento', e.target.value.slice(0, 100))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Apto, Bloco..." maxLength={100} disabled={isSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro <span className="text-red-500">*</span></label>
                <input type="text" value={formData.bairro} onChange={(e) => handleInputChange('bairro', e.target.value.slice(0, 100))} className={`w-full px-4 py-3 border rounded-lg ${errors.bairro ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} placeholder="Bairro" maxLength={100} disabled={isSubmitting} />
                {errors.bairro && <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade <span className="text-red-500">*</span></label>
                <input type="text" value={formData.cidade} onChange={(e) => handleInputChange('cidade', e.target.value.slice(0, 100))} className={`w-full px-4 py-3 border rounded-lg ${errors.cidade ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} placeholder="Cidade" maxLength={100} disabled={isSubmitting} />
                {errors.cidade && <p className="text-red-500 text-sm mt-1">{errors.cidade}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado <span className="text-red-500">*</span></label>
                <select value={formData.estado} onChange={(e) => handleInputChange('estado', e.target.value)} className={`w-full px-4 py-3 border rounded-lg ${errors.estado ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} disabled={isSubmitting}>
                  <option value="">Selecione</option>
                  {ESTADOS_BRASIL.map(uf => <option key={uf.sigla} value={uf.sigla}>{uf.sigla} — {uf.nome}</option>)}
                </select>
                {errors.estado && <p className="text-red-500 text-sm mt-1">{errors.estado}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 6. OBSERVAÇÕES ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <SectionHeader icon={MessageSquare} title="Observações" number={6} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações <span className="text-gray-400 text-xs ml-2">({formData.observacoes.length}/500)</span></label>
            <textarea value={formData.observacoes} onChange={(e) => handleInputChange('observacoes', e.target.value.slice(0, 500))} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none" placeholder="Informações adicionais (opcional)..." maxLength={500} disabled={isSubmitting} />
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div className="bg-primary h-1 rounded-full transition-all duration-300" style={{ width: `${(formData.observacoes.length / 500) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* ═══ BOTÕES ═══ */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button type="button" onClick={() => router.back()} className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full sm:w-auto justify-center" disabled={loading || isSubmitting}>
              <ArrowLeft className="w-4 h-4" />Voltar
            </button>
            <button type="submit" disabled={loading || isSubmitting || !allFilled} className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center font-medium">
              {loading || isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Cadastrando...</> : <><UserPlus className="w-4 h-4" />Cadastrar Custodiado</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Protected Wrapper ───────────────────────────────────────

export default function ProtectedRegistrarPage() {
  const router = useRouter();
  const { isAdmin } = usePermissions();
  const { logAction } = useAuth();

  const AccessDeniedContent = () => {
    logAction('page_access_denied', 'registrar_pessoa', { hasPermission: false, userType: isAdmin() ? 'admin' : 'usuario' });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-10 h-10 text-red-600" /></div>
          <h1 className="text-2xl font-bold text-red-800 mb-3">Acesso Negado</h1>
          <p className="text-red-700 mb-6">Você não tem permissão para cadastrar novas pessoas.</p>
          <button onClick={() => router.push('/dashboard/geral')} className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-dark font-medium flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" />Voltar</button>
        </div>
      </div>
    );
  };

  return (
    <PermissionGuard resource="pessoas" action="cadastrar" fallback={<AccessDeniedContent />} showMessage={false}>
      <RegistrarPage />
    </PermissionGuard>
  );
}
