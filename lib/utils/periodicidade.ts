/* eslint-disable @typescript-eslint/no-unused-vars */

import { Periodicidade } from '@/types';

export interface ConfigPeriodicidade {
  dias: number;
  descricao: string;
  sugestoes?: string[];
}

// Configurações padrão de periodicidade em dias
export const PERIODICIDADES_PADROES: Record<string, Periodicidade> = {
  SEMANAL: 7,
  QUINZENAL: 15,
  MENSAL: 30,
  BIMENSAL: 60,
  TRIMESTRAL: 90,
  SEMESTRAL: 180
} as const;

// Sugestões de períodos comuns
export const PERIODOS_SUGERIDOS: ConfigPeriodicidade[] = [
  { dias: 7, descricao: 'Semanal (7 dias)', sugestoes: ['Para casos que requerem acompanhamento intensivo'] },
  { dias: 15, descricao: 'Quinzenal (15 dias)', sugestoes: ['Para casos com necessidade de monitoramento frequente'] },
  { dias: 30, descricao: 'Mensal (30 dias)', sugestoes: ['Padrão para a maioria dos casos'] },
  { dias: 60, descricao: 'Bimensal (60 dias)', sugestoes: ['Para casos estáveis com baixo risco'] },
  { dias: 90, descricao: 'Trimestral (90 dias)', sugestoes: ['Para casos de longo prazo com histórico positivo'] },
  { dias: 180, descricao: 'Semestral (180 dias)', sugestoes: ['Para casos especiais com baixíssimo risco'] }
];

/**
 * Calcula a próxima data de comparecimento baseada na periodicidade
 */
export function calcularProximoComparecimento(
  dataBase: string | Date,
  periodicidade: Periodicidade
): Date {
  const data = typeof dataBase === 'string' ? new Date(dataBase) : dataBase;
  const novaData = new Date(data);

  if (periodicidade < 1) {
    throw new Error('Periodicidade deve ser um número maior que zero');
  }

  novaData.setDate(novaData.getDate() + periodicidade);
  return novaData;
}

/**
 * Gera uma sequência de datas de comparecimento
 */
export function gerarSequenciaComparecimentos(
  dataInicial: string | Date,
  periodicidade: Periodicidade,
  quantidade: number
): Date[] {
  const datas: Date[] = [];
  let dataAtual = typeof dataInicial === 'string' ? new Date(dataInicial) : dataInicial;

  for (let i = 0; i < quantidade; i++) {
    if (i === 0) {
      datas.push(new Date(dataAtual));
    } else {
      dataAtual = calcularProximoComparecimento(dataAtual, periodicidade);
      datas.push(new Date(dataAtual));
    }
  }

  return datas;
}

/**
 * Valida se um período é adequado
 */
export function validarPeriodicidade(dias: number): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validações de erro (impedem o salvamento)
  if (!Number.isInteger(dias) || dias < 1) {
    errors.push('A periodicidade deve ser um número inteiro maior que zero');
  }

  if (dias > 365) {
    errors.push('A periodicidade não pode ser maior que 365 dias (1 ano)');
  }

  // Validações de aviso (não impedem o salvamento)
  if (dias < 7 && dias >= 1) {
    warnings.push('Período muito curto pode gerar sobrecarga administrativa');
  }

  if (dias > 180) {
    warnings.push('Período muito longo pode não ser adequado para o acompanhamento');
  }

  if (dias % 7 !== 0 && dias > 7) {
    warnings.push('Considere usar múltiplos de 7 dias para facilitar o agendamento');
  }

  // Verificar se há uma periodicidade padrão similar
  const periodicidadesSimilares = Object.entries(PERIODICIDADES_PADROES).filter(
    ([_, valor]) => Math.abs(valor - dias) <= 2
  );

  if (periodicidadesSimilares.length > 0) {
    const [nome] = periodicidadesSimilares[0];
    warnings.push(`Este período é similar ao ${nome.toLowerCase()}. Considere usar a opção padrão.`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Converte periodicidade para formato legível
 */
export function formatarPeriodicidade(dias: Periodicidade): string {
  // Verificar se é uma periodicidade padrão
  const periodicidadePadrao = Object.entries(PERIODICIDADES_PADROES).find(
    ([_, valor]) => valor === dias
  );

  if (periodicidadePadrao) {
    const [nome] = periodicidadePadrao;
    return `${nome.charAt(0) + nome.slice(1).toLowerCase()} (${dias} dias)`;
  }

  // Se não é padrão, mostrar como personalizada
  return `Personalizada (${dias} dias)`;
}

/**
 * Obtém recomendações baseadas no tipo de caso
 */
export function obterRecomendacoesPeriodo(tipoCaso?: string): {
  recomendado: Periodicidade;
  justificativa: string;
} {
  // lógica baseada no tipo de caso
  return {
    recomendado: PERIODICIDADES_PADROES.BIMENSAL,
    justificativa: 'Periodicidade bimensal (60 dias) é adequada para a maioria dos casos de liberdade provisória'
  };
}

/**
 * Calcula estatísticas de uma periodicidade
 */
export function calcularEstatisticasPeriodicidade(periodicidade: Periodicidade): {
  diasEntrePeriodos: number;
  comparecimentosPorAno: number;
  comparecimentosPorMes: number;
  observacoes: string[];
} {
  const comparecimentosPorAno = Math.round(365 / periodicidade);
  const comparecimentosPorMes = Math.round(30 / periodicidade * 10) / 10; // Uma casa decimal

  const observacoes: string[] = [];

  if (comparecimentosPorMes > 4) {
    observacoes.push('Alta frequência de comparecimentos (mais de 4 por mês)');
  } else if (comparecimentosPorMes < 0.5) {
    observacoes.push('Baixa frequência de comparecimentos (menos de 1 a cada 2 meses)');
  }

  return {
    diasEntrePeriodos: periodicidade,
    comparecimentosPorAno,
    comparecimentosPorMes,
    observacoes
  };
}

/**
 * Converte periodicidade antiga (string) para nova (number)
 */
export function migrarPeriodicidade(
  periodicidadeAntiga: 'mensal' | 'bimensal'
): Periodicidade {
  switch (periodicidadeAntiga) {
    case 'mensal':
      return PERIODICIDADES_PADROES.MENSAL;
    case 'bimensal':
      return PERIODICIDADES_PADROES.BIMENSAL;
    default:
      return PERIODICIDADES_PADROES.MENSAL;
  }
}

/**
 * Obtém todas as periodicidades sugeridas
 */
export function obterPeriodicidadesSugeridas(): ConfigPeriodicidade[] {
  return PERIODOS_SUGERIDOS;
}

/**
 * Verifica se uma periodicidade é considerada padrão
 */
export function isPeriodicidadePadrao(dias: Periodicidade): boolean {
  return Object.values(PERIODICIDADES_PADROES).includes(dias);
}