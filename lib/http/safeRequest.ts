import { logger } from '@/lib/utils/logger';
import type { ApiResponse } from '@/lib/http/client';

/**
 * Executa uma chamada HTTP de forma segura, retornando fallback em caso de erro.
 */
export async function safeRequest<T>(
  fn: () => Promise<T>,
  fallback: T,
  label?: string
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error(`[safeRequest]${label ? ` ${label}:` : ''}`, err);
    return fallback;
  }
}

/**
 * Extrai o payload útil de respostas aninhadas do backend.
 * Trata formatos: { data: { data: payload } } e { data: payload }
 */
export function unwrap<T>(response: ApiResponse<T>): T | null {
  if (!response || !response.success) return null;

  const outer = response.data;
  if (outer === null || outer === undefined) return null;

  if (
    typeof outer === 'object' &&
    !Array.isArray(outer) &&
    'data' in (outer as Record<string, unknown>)
  ) {
    return (outer as Record<string, unknown>).data as T;
  }

  return outer;
}
