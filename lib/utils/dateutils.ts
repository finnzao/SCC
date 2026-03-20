// lib/utils/dateutils.ts - FIXED: null-safe date handling throughout

/**
 * ✅ FIX: All functions now handle null/undefined gracefully
 */

/**
 * Converte uma string de data (YYYY-MM-DD) para um objeto Date sem problemas de timezone
 */
export function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString) return new Date();
  
  // Handle Date objects passed as any
  if (dateString instanceof Date) return dateString;
  
  // Handle string dates
  const str = String(dateString);
  
  // If it contains 'T', extract just the date part
  const datePart = str.includes('T') ? str.split('T')[0] : str;
  
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Validate parsed numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
  
  return new Date(year, month - 1, day);
}

/**
 * Formata um objeto Date para string no formato YYYY-MM-DD (data local)
 */
export function formatToLocalDateString(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * ✅ FIX: Formata uma string de data para formato brasileiro (DD/MM/YYYY)
 * Agora lida corretamente com null, undefined, Date objects e strings inválidas
 */
export function formatToBrazilianDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  // Handle Date objects
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) return '';
    const day = String(dateString.getDate()).padStart(2, '0');
    const month = String(dateString.getMonth() + 1).padStart(2, '0');
    const year = dateString.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Handle string dates
  const str = String(dateString);
  if (!str || str === 'null' || str === 'undefined') return '';
  
  try {
    const date = parseLocalDate(str);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Formata uma data para exibição com dia da semana em português
 */
export function formatWithWeekday(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  const date = parseLocalDate(dateString);
  if (isNaN(date.getTime())) return '';
  
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const weekday = weekdays[date.getDay()];
  
  return `${weekday}, ${formatToBrazilianDate(dateString)}`;
}

/**
 * Converte Date para o formato aceito pelo input type="date" (YYYY-MM-DD)
 */
export function toInputDateValue(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return '';
  return formatToLocalDateString(date);
}

/**
 * Obtém a data atual no formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return formatToLocalDateString(new Date());
}

// ========== FUNÇÕES PARA TIMESTAMPS ==========

/**
 * ✅ FIX: Extrai apenas a data (YYYY-MM-DD) de um timestamp ISO 8601
 * Lida com null/undefined
 */
export function extractDateFromTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  
  const str = String(timestamp);
  if (str === 'null' || str === 'undefined') return '';
  
  const datePart = str.split('T')[0];
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  
  return '';
}

/**
 * Converte timestamp ISO 8601 para formato brasileiro (DD/MM/YYYY)
 */
export function formatTimestampToBrazilian(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const dateOnly = extractDateFromTimestamp(timestamp);
  return formatToBrazilianDate(dateOnly);
}

/**
 * Converte timestamp ISO 8601 para formato brasileiro completo com hora
 */
export function formatTimestampToBrazilianFull(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Converte timestamp ISO 8601 para objeto Date
 */
export function parseTimestamp(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null;
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Formata timestamp para exibição relativa (há X horas/dias)
 */
export function formatTimestampRelative(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  
  const date = parseTimestamp(timestamp);
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'agora mesmo';
  if (diffMinutes < 60) return `há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 30) return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  return formatTimestampToBrazilian(timestamp);
}

/**
 * Verifica se um timestamp é de hoje
 */
export function isTimestampToday(timestamp: string | null | undefined): boolean {
  if (!timestamp) return false;
  
  const date = parseTimestamp(timestamp);
  if (!date) return false;
  
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Extrai apenas a hora (HH:mm) de um timestamp
 */
export function extractTimeFromTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  
  const date = parseTimestamp(timestamp);
  if (!date) return '';
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * ✅ NEW: Safe date formatting that never returns "Invalid Date" or "NaN"
 * Used throughout the app where dates might be null
 */
export function safeFormatDate(date: string | Date | null | undefined, fallback = ''): string {
  if (!date) return fallback;
  
  const result = formatToBrazilianDate(date);
  return result || fallback;
}
