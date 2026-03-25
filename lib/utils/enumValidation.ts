/* eslint-disable @typescript-eslint/no-explicit-any */

import { TipoValidacao } from '@/types/api';

/**
 *  Converte enum do frontend para string MINÚSCULA aceita pelo backend
 */
export function convertTipoValidacaoToString(tipo: TipoValidacao): string {
  switch (tipo) {
    case TipoValidacao.PRESENCIAL:
      return 'presencial';
    case TipoValidacao.ONLINE:
      return 'online';
    case TipoValidacao.CADASTRO_INICIAL:
      return 'cadastro_inicial'; 
    default:
      return String(tipo).toLowerCase().replace(/\s+/g, '_');
  }
}

/**
 * Valida se o estado brasileiro é válido
 */
export function validateEstadoBrasil(estado: string): string {
  const estadosValidos = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const estadoUpper = estado.toUpperCase();

  if (!estadosValidos.includes(estadoUpper)) {
    throw new Error(`Estado inválido: ${estado}. Use uma sigla válida como BA, SP, RJ, etc.`);
  }

  return estadoUpper;
}

/**
 * Converte status para string aceita pelo backend
 */
export function convertStatusToString(status: string): string {
  const statusUpper = status.toUpperCase();

  if (statusUpper === 'EM CONFORMIDADE' || statusUpper === 'EM_CONFORMIDADE') {
    return 'EM_CONFORMIDADE';
  }

  if (statusUpper === 'INADIMPLENTE') {
    return 'INADIMPLENTE';
  }

  return statusUpper;
}

/**
 *  Sanitiza dados do formulário antes do envio
 */
export function sanitizeFormData(data: any): any {
  return {
    ...data,

    validadoPor: data.validadoPor?.trim(),
    observacoes: data.observacoes?.trim() || undefined,
    motivoMudancaEndereco: data.motivoMudancaEndereco?.trim() || undefined,

    tipoValidacao: convertTipoValidacaoToString(data.tipoValidacao),

    // Validar endereço se houver
    ...(data.novoEndereco && {
      novoEndereco: {
        ...data.novoEndereco,
        estado: validateEstadoBrasil(data.novoEndereco.estado),
        cep: data.novoEndereco.cep?.replace(/\D/g, ''),
        logradouro: data.novoEndereco.logradouro?.trim(),
        numero: data.novoEndereco.numero?.trim() || undefined,
        complemento: data.novoEndereco.complemento?.trim() || undefined,
        bairro: data.novoEndereco.bairro?.trim(),
        cidade: data.novoEndereco.cidade?.trim()
      }
    })
  };
}

/**
 * Valida dados antes do envio.
 * 
 * FIX: The backend accepts EITHER processoId OR custodiadoId.
 * processoId is preferred (Caminho A). custodiadoId is fallback (Caminho B).
 * Only fail if NEITHER is provided.
 */
export function validateBeforeSend(data: any): any {
  const errors: string[] = [];

  // Accept either processoId or custodiadoId
  const hasProcessoId = data.processoId && data.processoId > 0;
  const hasCustodiadoId = data.custodiadoId && data.custodiadoId > 0;

  if (!hasProcessoId && !hasCustodiadoId) {
    errors.push('É necessário informar o ID do processo ou do custodiado');
  }

  if (!data.dataComparecimento) {
    errors.push('Data do comparecimento é obrigatória');
  }

  if (!data.tipoValidacao) {
    errors.push('Tipo de validação é obrigatório');
  }

  if (!data.validadoPor?.trim()) {
    errors.push('Campo "Validado por" é obrigatório');
  }

  // Validar endereço se houver mudança
  if (data.mudancaEndereco && data.novoEndereco) {
    const endereco = data.novoEndereco;

    if (!endereco.cep?.trim()) {
      errors.push('CEP é obrigatório para atualização de endereço');
    }

    if (!endereco.logradouro?.trim()) {
      errors.push('Logradouro é obrigatório para atualização de endereço');
    }

    if (!endereco.bairro?.trim()) {
      errors.push('Bairro é obrigatório para atualização de endereço');
    }

    if (!endereco.cidade?.trim()) {
      errors.push('Cidade é obrigatória para atualização de endereço');
    }

    if (!endereco.estado?.trim()) {
      errors.push('Estado é obrigatório para atualização de endereço');
    } else {
      try {
        validateEstadoBrasil(endereco.estado);
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error.message);
        } else {
          errors.push('Erro ao validar estado');
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return data;
}

/**
 * Log detalhado para debug
 */
export function logFormDataForDebug(data: any, label: string = 'FormData'): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`[${label}] Dados do formulário:`);
    console.log(' Dados originais:', data);
    console.log(' processoId:', data.processoId);
    console.log(' custodiadoId:', data.custodiadoId);
    console.log(' tipoValidacao:', typeof data.tipoValidacao, data.tipoValidacao);

    if (data.novoEndereco) {
      console.log(' Endereço:', data.novoEndereco);
      console.log(' Estado:', data.novoEndereco.estado, typeof data.novoEndereco.estado);
    }

    try {
      const sanitized = sanitizeFormData(data);
      console.log(' Dados sanitizados:', sanitized);

      validateBeforeSend(sanitized);
      console.log(' Validação passou!');
    } catch (error) {
      console.error('❌ Erro na sanitização/validação:', error);
    }

    console.groupEnd();
  }
}
