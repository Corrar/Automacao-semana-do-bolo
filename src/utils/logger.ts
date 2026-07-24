type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const line = `${prefix} ${message}`;

  if (meta !== undefined) {
    if (level === 'error') {
      console.error(line, meta);
    } else if (level === 'warn') {
      console.warn(line, meta);
    } else {
      console.log(line, meta);
    }
    return;
  }

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Logger simples e centralizado da aplicação.
 * Mantido leve para não adicionar dependências externas.
 */
export const logger = {
  info: (message: string, meta?: unknown): void => write('info', message, meta),
  warn: (message: string, meta?: unknown): void => write('warn', message, meta),
  error: (message: string, meta?: unknown): void =>
    write('error', message, meta),
  debug: (message: string, meta?: unknown): void =>
    write('debug', message, meta),
};
