// components/ProcessoForm.tsx - F5: Formulário de novo processo
'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useProcessos } from '@/hooks/useProcessos';
import { useToast } from '@/components/Toast';
import type { ProcessoDTO } from '@/types/processo';

interface ProcessoFormProps {
  custodiadoId?: number;
  custodiadoNome?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const PERIODICIDADE_OPTIONS = [
  { value: 7, label: 'Semanal (7 dias)' },
  { value: 15, label: 'Quinzenal (15 dias)' },
  { value: 30, label: 'Mensal (30 dias)' },
  { value: 60, label: 'Bimestral (60 dias)' },
  { value: 90, label: 'Trimestral (90 dias)' },
];

// Regex para formato CNJ: 0000000-00.0000.0.00.0000
const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;

function formatProcessoCNJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 20);
  if (numbers.length <= 7) return numbers;
  if (numbers.length <= 9) return `${numbers.slice(0, 7)}-${numbers.slice(7)}`;
  if (numbers.length <= 13) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9)}`;
  if (numbers.length <= 14) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13)}`;
  if (numbers.length <= 16) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14)}`;
  return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14, 16)}.${numbers.slice(16)}`;
}

export default function ProcessoForm({ custodiadoId, custodiadoNome, onClose, onSuccess }: ProcessoFormProps) {
  const { criar, loading } = useProcessos();
  const { showToast } = useToast();

  const [form, setForm] = useState<ProcessoDTO>({
    custodiadoId: custodiadoId || 0,
    numeroProcesso: '',
    vara: '',
    comarca: '',
    dataDecisao: '',
    periodicidade: 30,
    dataComparecimentoInicial: '',
    observacoes: '',
  });

  const [useCustomPeriodicidade, setUseCustomPeriodicidade] = useState(false);
  const [customDias, setCustomDias] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.custodiadoId || form.custodiadoId <= 0) {
      newErrors.custodiadoId = 'Custodiado é obrigatório';
    }

    if (!form.numeroProcesso.trim()) {
      newErrors.numeroProcesso = 'Número do processo é obrigatório';
    } else if (!CNJ_REGEX.test(form.numeroProcesso)) {
      const digits = form.numeroProcesso.replace(/\D/g, '');
      if (digits.length !== 20) {
        newErrors.numeroProcesso = 'Processo deve ter exatamente 20 dígitos no formato CNJ';
      }
    }

    if (!form.vara.trim()) {
      newErrors.vara = 'Vara é obrigatória';
    } else if (form.vara.trim().length > 100) {
      newErrors.vara = 'Vara deve ter no máximo 100 caracteres';
    }

    if (!form.comarca.trim()) {
      newErrors.comarca = 'Comarca é obrigatória';
    } else if (form.comarca.trim().length > 100) {
      newErrors.comarca = 'Comarca deve ter no máximo 100 caracteres';
    }

    if (!form.dataDecisao) {
      newErrors.dataDecisao = 'Data da decisão é obrigatória';
    } else {
      const decisao = new Date(form.dataDecisao);
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      if (decisao > hoje) {
        newErrors.dataDecisao = 'Data da decisão não pode ser futura';
      }
    }

    if (!form.dataComparecimentoInicial) {
      newErrors.dataComparecimentoInicial = 'Data do comparecimento inicial é obrigatória';
    } else if (form.dataDecisao && form.dataComparecimentoInicial < form.dataDecisao) {
      newErrors.dataComparecimentoInicial = 'Data do comparecimento não pode ser anterior à data da decisão';
    }

    if (form.periodicidade < 1 || form.periodicidade > 365) {
      newErrors.periodicidade = 'Periodicidade deve ser entre 1 e 365 dias';
    }

    if (form.observacoes && form.observacoes.length > 500) {
      newErrors.observacoes = 'Observações deve ter no máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast({ type: 'warning', title: 'Atenção', message: 'Corrija os erros antes de continuar', duration: 3000 });
      return;
    }

    const result = await criar({
      ...form,
      numeroProcesso: form.numeroProcesso.trim(),
      vara: form.vara.trim(),
      comarca: form.comarca.trim(),
      observacoes: form.observacoes?.trim() || undefined,
    });

    if (result.success) {
      showToast({ type: 'success', title: 'Sucesso', message: 'Processo criado com sucesso', duration: 3000 });
      onSuccess?.();
      onClose();
    } else {
      showToast({ type: 'error', title: 'Erro', message: result.message, duration: 5000 });
    }
  };

  const handlePeriodicidadeSelect = (value: string) => {
    if (value === 'custom') {
      setUseCustomPeriodicidade(true);
      setCustomDias('');
    } else {
      setUseCustomPeriodicidade(false);
      setForm(prev => ({ ...prev, periodicidade: parseInt(value) }));
    }
  };

  const handleCustomDiasChange = (value: string) => {
    // Only allow positive numbers
    const cleaned = value.replace(/[^0-9]/g, '');
    setCustomDias(cleaned);
    const num = parseInt(cleaned);
    if (!isNaN(num) && num >= 1 && num <= 365) {
      setForm(prev => ({ ...prev, periodicidade: num }));
      if (errors.periodicidade) {
        setErrors(prev => { const e = { ...prev }; delete e.periodicidade; return e; });
      }
    }
  };

  const handleChange = (field: keyof ProcessoDTO, value: string | number) => {
    if (field === 'numeroProcesso' && typeof value === 'string') {
      value = formatProcessoCNJ(value);
    }
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Novo Processo</h2>
              {custodiadoNome && (
                <p className="text-sm text-gray-500">Vinculado a: {custodiadoNome}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Número do Processo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número do Processo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.numeroProcesso}
              onChange={e => handleChange('numeroProcesso', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg font-mono focus:ring-2 focus:ring-primary focus:border-transparent ${errors.numeroProcesso ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder="0000000-00.0000.0.00.0000"
              maxLength={25}
              disabled={loading}
            />
            {errors.numeroProcesso && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.numeroProcesso}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO</p>
          </div>

          {/* Vara e Comarca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vara <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.vara}
                onChange={e => handleChange('vara', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.vara ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                placeholder="Ex: 1ª Vara Criminal"
                maxLength={100}
                disabled={loading}
              />
              {errors.vara && <p className="text-red-500 text-sm mt-1">{errors.vara}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comarca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.comarca}
                onChange={e => handleChange('comarca', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.comarca ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                placeholder="Ex: Salvador"
                maxLength={100}
                disabled={loading}
              />
              {errors.comarca && <p className="text-red-500 text-sm mt-1">{errors.comarca}</p>}
            </div>
          </div>

          {/* Data da Decisão e Comparecimento Inicial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Decisão <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dataDecisao}
                onChange={e => handleChange('dataDecisao', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.dataDecisao ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                max={new Date().toISOString().split('T')[0]}
                disabled={loading}
              />
              {errors.dataDecisao && <p className="text-red-500 text-sm mt-1">{errors.dataDecisao}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Comparecimento Inicial <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dataComparecimentoInicial}
                onChange={e => handleChange('dataComparecimentoInicial', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.dataComparecimentoInicial ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                min={form.dataDecisao || undefined}
                disabled={loading}
              />
              {errors.dataComparecimentoInicial && <p className="text-red-500 text-sm mt-1">{errors.dataComparecimentoInicial}</p>}
            </div>
          </div>

          {/* Periodicidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodicidade <span className="text-red-500">*</span>
            </label>
            {!useCustomPeriodicidade ? (
              <select
                value={form.periodicidade.toString()}
                onChange={e => handlePeriodicidadeSelect(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.periodicidade ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                disabled={loading}
              >
                {PERIODICIDADE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                <option value="custom">Personalizada...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customDias}
                  onChange={e => handleCustomDiasChange(e.target.value)}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.periodicidade ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Dias (1-365)"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => { setUseCustomPeriodicidade(false); setForm(prev => ({ ...prev, periodicidade: 30 })); }}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Padrão
                </button>
              </div>
            )}
            {errors.periodicidade && <p className="text-red-500 text-sm mt-1">{errors.periodicidade}</p>}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações <span className="text-gray-400 text-xs ml-1">(opcional, max 500)</span>
            </label>
            <textarea
              value={form.observacoes || ''}
              onChange={e => handleChange('observacoes', e.target.value)}
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${errors.observacoes ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder="Observações sobre o processo..."
              maxLength={500}
              disabled={loading}
            />
            <p className="text-gray-500 text-xs mt-1 text-right">{(form.observacoes || '').length}/500</p>
          </div>

          {/* Botões */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Criar Processo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
