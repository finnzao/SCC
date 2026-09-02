// Validacao e payload do registro de pena. Puro para testar no Vitest;
// a matematica da pena e do backend.

import type { RegistroPenaForm, RegistroPenaPayload } from '@/types/execucao';

const CNJ_REGEX = /^[0-9]{7}-[0-9]{2}[.][0-9]{4}[.][0-9][.][0-9]{2}[.][0-9]{4}$/;

export interface ResultadoValidacao {
  valido: boolean;
  erros: Partial<Record<keyof RegistroPenaForm, string>>;
}

export function validarRegistroPena(form: RegistroPenaForm): ResultadoValidacao {
  const erros: ResultadoValidacao['erros'] = {};

  if (!form.origemCalculo) {
    erros.origemCalculo = 'Escolha como a pena está descrita na sentença';
  }
  if (!form.numeroExecucao.trim()) {
    erros.numeroExecucao = 'Número da execução (PEC) é obrigatório';
  } else if (!CNJ_REGEX.test(form.numeroExecucao.trim())) {
    erros.numeroExecucao = 'Formato CNJ esperado: 0000000-00.0000.0.00.0000';
  }
  if (!form.dataInicio) {
    erros.dataInicio = 'Data de início do cumprimento é obrigatória';
  }

  if (form.origemCalculo === 'SENTENCA') {
    if (!form.dataTermino) {
      erros.dataTermino = 'Data de término é obrigatória nesta opção';
    } else if (form.dataInicio && form.dataTermino < form.dataInicio) {
      // yyyy-MM-dd compara lexicograficamente; termino == inicio é pena de 1 dia, válida
      erros.dataTermino = 'Término não pode ser anterior ao início';
    }
  }

  if (form.origemCalculo === 'DOSIMETRIA_CALCULADA') {
    const anos = parseInt(form.anos || '0', 10);
    const meses = parseInt(form.meses || '0', 10);
    const dias = parseInt(form.dias || '0', 10);
    if ([anos, meses, dias].some(n => Number.isNaN(n) || n < 0)) {
      erros.anos = 'Tempo de pena não pode ser negativo';
    } else if (anos === 0 && meses === 0 && dias === 0) {
      erros.anos = 'Informe o tempo da pena (pelo menos um campo maior que zero)';
    }
  }

  if (form.diasDetraidos) {
    const d = parseInt(form.diasDetraidos, 10);
    if (Number.isNaN(d) || d < 0) erros.diasDetraidos = 'Detração não pode ser negativa';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

// payload so com os campos do card escolhido
export function montarPayloadRegistroPena(
  form: RegistroPenaForm,
  processoId: number,
): RegistroPenaPayload {
  const base: RegistroPenaPayload = {
    processoId,
    origemCalculo: form.origemCalculo as RegistroPenaPayload['origemCalculo'],
    numeroExecucao: form.numeroExecucao.trim(),
    dataInicio: form.dataInicio,
  };
  if (form.guiaRecolhimento.trim()) base.guiaRecolhimento = form.guiaRecolhimento.trim();
  if (form.numeroSeeu.trim()) base.numeroSeeu = form.numeroSeeu.trim();
  const detraidos = parseInt(form.diasDetraidos || '0', 10);
  if (detraidos > 0) base.diasDetraidos = detraidos;
  if (form.observacoes.trim()) base.observacoes = form.observacoes.trim();

  if (form.origemCalculo === 'SENTENCA') {
    base.dataTermino = form.dataTermino;
  } else {
    base.anos = parseInt(form.anos || '0', 10);
    base.meses = parseInt(form.meses || '0', 10);
    base.dias = parseInt(form.dias || '0', 10);
  }
  return base;
}

export const FORM_VAZIO: RegistroPenaForm = {
  origemCalculo: null,
  numeroExecucao: '',
  guiaRecolhimento: '',
  numeroSeeu: '',
  diasDetraidos: '',
  dataInicio: '',
  dataTermino: '',
  anos: '',
  meses: '',
  dias: '',
  observacoes: '',
};
