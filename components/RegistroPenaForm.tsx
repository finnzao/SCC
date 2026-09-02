'use client';

// Registro de pena: o card escolhido define os campos; a conversao de datas
// (CP art. 10) e do backend. CamposPena e reusado embutido no cadastro inicial.

import { useState } from 'react';
import { X, Gavel, CalendarCheck, CalendarClock, Save, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { execucaoService } from '@/services/execucaoService';
import { validarRegistroPena, montarPayloadRegistroPena, FORM_VAZIO } from '@/lib/execucaoPena';
import { ApenasDigitos } from '@/lib/utils/validation';
import type { RegistroPenaForm as FormState, OrigemCalculo, ExecucaoPenal } from '@/types/execucao';

const CARDS: Array<{
  origem: OrigemCalculo;
  titulo: string;
  subtexto: string;
  Icone: typeof CalendarCheck;
}> = [
  {
    origem: 'SENTENCA',
    titulo: 'A sentença já tem a DATA FINAL do cumprimento',
    subtexto: 'Escolha esta opção se no documento do juiz já está escrita a data em que a pena termina.',
    Icone: CalendarCheck,
  },
  {
    origem: 'DOSIMETRIA_CALCULADA',
    titulo: 'A sentença informa o TEMPO DA PENA (Anos e Meses)',
    subtexto: 'Escolha esta opção se o documento diz apenas o tempo de condenação (ex: 2 anos e 6 meses).',
    Icone: CalendarClock,
  },
];

interface CamposPenaProps {
  form: FormState;
  erros: ReturnType<typeof validarRegistroPena>['erros'];
  onChange: (form: FormState) => void;
  disabled?: boolean;
}

export function CamposPena({ form, erros, onChange, disabled = false }: CamposPenaProps) {
  const set = (campo: keyof FormState, valor: string) =>
    onChange({ ...form, [campo]: valor });

  const selecionarCard = (origem: OrigemCalculo) => {
    // trocar de card descarta os campos do outro fluxo
    onChange({
      ...FORM_VAZIO,
      numeroExecucao: form.numeroExecucao,
      guiaRecolhimento: form.guiaRecolhimento,
      numeroSeeu: form.numeroSeeu,
      diasDetraidos: form.diasDetraidos,
      dataInicio: form.dataInicio,
      observacoes: form.observacoes,
      origemCalculo: origem,
    });
  };

  const campoData = (label: string, campo: keyof FormState, erro?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="date"
        value={form[campo] as string}
        onChange={e => set(campo, e.target.value)}
        disabled={disabled}
        className={'w-full border rounded-lg px-3 py-2 ' + (erro ? 'border-red-400' : 'border-gray-300')}
      />
      {erro && (
        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />{erro}
        </p>
      )}
    </div>
  );

  const campoNumero = (label: string, campo: keyof FormState) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={form[campo] as string}
        onChange={e => set(campo, ApenasDigitos(e.target.value))}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map(({ origem, titulo, subtexto, Icone }) => {
          const ativo = form.origemCalculo === origem;
          return (
            <button
              key={origem}
              type="button"
              onClick={() => selecionarCard(origem)}
              disabled={disabled}
              aria-pressed={ativo}
              className={
                'text-left p-4 rounded-xl border-2 transition-all ' +
                (ativo ? 'border-purple-600 bg-purple-50 shadow' : 'border-gray-200 hover:border-purple-300')
              }
            >
              <Icone className={'w-6 h-6 mb-2 ' + (ativo ? 'text-purple-700' : 'text-gray-400')} />
              <p className="font-semibold text-sm">{titulo}</p>
              <p className="text-xs text-gray-500 mt-1">{subtexto}</p>
            </button>
          );
        })}
      </div>
      {erros.origemCalculo && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />{erros.origemCalculo}
        </p>
      )}

      {form.origemCalculo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº da execução (PEC)</label>
              <input
                type="text"
                placeholder="0000000-00.0000.0.00.0000"
                value={form.numeroExecucao}
                onChange={e => set('numeroExecucao', e.target.value)}
                disabled={disabled}
                className={
                  'w-full border rounded-lg px-3 py-2 font-mono text-sm ' +
                  (erros.numeroExecucao ? 'border-red-400' : 'border-gray-300')
                }
              />
              {erros.numeroExecucao && <p className="text-sm text-red-600 mt-1">{erros.numeroExecucao}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guia de recolhimento (opcional)</label>
              <input
                type="text"
                value={form.guiaRecolhimento}
                onChange={e => set('guiaRecolhimento', e.target.value)}
                disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº no SEEU (opcional)</label>
              <input
                type="text"
                placeholder="referência para conferência"
                value={form.numeroSeeu}
                onChange={e => set('numeroSeeu', e.target.value)}
                disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dias de detração (opcional)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={form.diasDetraidos}
                onChange={e => set('diasDetraidos', ApenasDigitos(e.target.value))}
                disabled={disabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Preencha apenas se a guia NÃO veio com a pena líquida — o sistema desconta da data prevista.
              </p>
              {erros.diasDetraidos && <p className="text-sm text-red-600 mt-1">{erros.diasDetraidos}</p>}
            </div>
          </div>

          {form.origemCalculo === 'SENTENCA' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campoData('Data de início', 'dataInicio', erros.dataInicio)}
              {campoData('Data de término (da sentença)', 'dataTermino', erros.dataTermino)}
            </div>
          )}

          {form.origemCalculo === 'DOSIMETRIA_CALCULADA' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {campoData('Data de início', 'dataInicio', erros.dataInicio)}
              {campoNumero('Anos', 'anos')}
              {campoNumero('Meses', 'meses')}
              {campoNumero('Dias', 'dias')}
            </div>
          )}
          {erros.anos && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />{erros.anos}
            </p>
          )}

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            O sistema calcula a pena em dias e a data de término pela regra do art. 10 do
            Código Penal (o dia do início conta). Detração e remição são lançadas depois,
            por decisão judicial — o registro aqui não as inclui.
          </p>
        </>
      )}
    </div>
  );
}

interface Props {
  processoId: number;
  numeroProcesso: string;
  onClose: () => void;
  onSuccess?: (execucao: ExecucaoPenal) => void;
}

export function RegistroPenaForm({ processoId, numeroProcesso, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<ReturnType<typeof validarRegistroPena>['erros']>({});
  const [salvando, setSalvando] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validacao = validarRegistroPena(form);
    setErros(validacao.erros);
    if (!validacao.valido) return;

    setSalvando(true);
    try {
      const resp = await execucaoService.registrar(montarPayloadRegistroPena(form, processoId));
      if (resp.success) {
        showToast({ type: 'success', title: 'Pena registrada', message: 'Execução penal registrada com sucesso.', duration: 3000 });
        const dados = (resp.data as { data?: ExecucaoPenal } | undefined)?.data;
        if (dados && onSuccess) onSuccess(dados);
        onClose();
      } else {
        showToast({ type: 'error', title: 'Erro', message: resp.error || 'Erro ao registrar execução', duration: 5000 });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Gavel className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Registrar pena — regime aberto</h2>
              <p className="text-sm text-gray-500">Processo {numeroProcesso}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <CamposPena form={form} erros={erros} onChange={setForm} disabled={salvando} />

          {form.origemCalculo && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  maxLength={500}
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60 flex items-center gap-2"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Registrar pena
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
