/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CustomError extends Error {
  code?: string;
  status?: number;
  response?: any;
  originalError?: any;
}

export const ErrorCodes = {
  NO_REFERENCE_PHOTO: 'NO_REFERENCE_PHOTO',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VERIFICATION_ERROR: 'VERIFICATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function isCustomError(error: any): error is CustomError {
  return error && error.code && typeof error.code === 'string';
}

export function getErrorMessage(error: any): string {
  if (isCustomError(error)) {
    switch (error.code) {
      case ErrorCodes.NO_REFERENCE_PHOTO:
        return 'Não há foto de referência cadastrada para este processo.';
      
      case ErrorCodes.NETWORK_ERROR:
        return 'Erro de conexão com o servidor. Verifique sua internet.';
      
      case ErrorCodes.VERIFICATION_ERROR:
        return error.message || 'Erro na verificação facial.';
      
      case ErrorCodes.VALIDATION_ERROR:
        return error.message || 'Dados inválidos fornecidos.';
      
      default:
        return error.message || 'Erro inesperado. Tente novamente.';
    }
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Erro desconhecido. Por favor, tente novamente.';
}

export function createCustomError(
  message: string,
  code: ErrorCode,
  additionalData?: any
): CustomError {
  const error = new Error(message) as CustomError;
  error.code = code;
  
  if (additionalData) {
    Object.assign(error, additionalData);
  }
  
  return error;
}