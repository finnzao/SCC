/**
 * Utilitário interno para validar Date
 */
function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Converte string (YYYY-MM-DD ou ISO) ou Date para Date local seguro
 */
export function parseLocalDate(
  input: string | Date | null | undefined
): Date {
  if (!input) return new Date();

  if (isValidDate(input)) return input;

  const str = String(input).trim();
  if (!str || str === 'null' || str === 'undefined') return new Date();

  const datePart = str.includes('T') ? str.split('T')[0] : str;
  const parts = datePart.split('-').map(Number);

  if (parts.length !== 3) return new Date();

  const [year, month, day] = parts;

  if (!year || !month || !day) return new Date();

  const date = new Date(year, month - 1, day);

  return isValidDate(date) ? date : new Date();
}

/**
 * Formata Date para YYYY-MM-DD (input type="date")
 */
export function formatToLocalDateString(
  date: Date | null | undefined
): string {
  if (!isValidDate(date)) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formata para DD/MM/YYYY (Brasil)
 */
export function formatToBrazilianDate(
  input: string | Date | null | undefined
): string {
  if (!input) return '';

  if (isValidDate(input)) {
    const d = input;
    return `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear()}`;
  }

  const date = parseLocalDate(input);

  if (!isValidDate(date)) return '';

  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1
  ).padStart(2, '0')}/${date.getFullYear()}`;
}

/**
 * Formata com dia da semana
 */
export function formatWithWeekday(
  input: string | Date | null | undefined
): string {
  const date = parseLocalDate(input);
  if (!isValidDate(date)) return '';

  const weekdays = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];

  return `${weekdays[date.getDay()]}, ${formatToBrazilianDate(date)}`;
}

/**
 * Para input type="date"
 */
export function toInputDateValue(
  date: Date | null | undefined
): string {
  return formatToLocalDateString(date);
}

/**
 * Data atual YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return formatToLocalDateString(new Date());
}

// ================= TIMESTAMP =================

export function extractDateFromTimestamp(
  timestamp: string | null | undefined
): string {
  if (!timestamp) return '';

  const str = String(timestamp).trim();
  if (!str || str === 'null' || str === 'undefined') return '';

  const datePart = str.split('T')[0];

  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
}

export function formatTimestampToBrazilian(
  timestamp: string | null | undefined
): string {
  return formatToBrazilianDate(extractDateFromTimestamp(timestamp));
}

export function formatTimestampToBrazilianFull(
  timestamp: string | null | undefined
): string {
  const date = parseTimestamp(timestamp);
  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export function parseTimestamp(
  timestamp: string | null | undefined
): Date | null {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  return isValidDate(date) ? date : null;
}

export function formatTimestampRelative(
  timestamp: string | null | undefined
): string {
  const date = parseTimestamp(timestamp);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60)
    return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  if (hours < 24)
    return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (days < 30)
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;

  return formatTimestampToBrazilian(timestamp);
}

export function isTimestampToday(
  timestamp: string | null | undefined
): boolean {
  const date = parseTimestamp(timestamp);
  if (!date) return false;

  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function extractTimeFromTimestamp(
  timestamp: string | null | undefined
): string {
  const date = parseTimestamp(timestamp);
  if (!date) return '';

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

/**
 * Nunca retorna inválido
 */
export function safeFormatDate(
  input: string | Date | null | undefined,
  fallback = ''
): string {
  const result = formatToBrazilianDate(input);
  return result || fallback;
}