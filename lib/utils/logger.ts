const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  group: (...args: unknown[]) => {
    if (isDev) console.group(...args);
  },
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
};
