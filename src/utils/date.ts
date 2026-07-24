/**
 * Utilitários de data relacionados ao domínio do agente.
 *
 * A rotação NÃO utiliza a semana do ano para decidir o responsável
 * (isso é persistido no banco), mas usamos week/year apenas como
 * identificador único de "qual semana o histórico pertence", garantindo
 * a idempotência da execução semanal.
 */

const WEEKDAY = {
  SUNDAY: 0,
  FRIDAY: 5,
} as const;

/**
 * Calcula a próxima sexta-feira a partir de uma data de referência.
 * Se a data de referência já for sexta, retorna a sexta seguinte.
 */
export function getNextFriday(reference: Date = new Date()): Date {
  const date = new Date(reference);
  const day = date.getDay();

  let daysUntilFriday = (WEEKDAY.FRIDAY - day + 7) % 7;
  if (daysUntilFriday === 0) {
    daysUntilFriday = 7;
  }

  date.setDate(date.getDate() + daysUntilFriday);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Retorna o número da semana ISO-8601 (1-53) e o ano correspondente.
 * Usado como chave de idempotência da execução semanal.
 */
export function getIsoWeekAndYear(reference: Date = new Date()): {
  week: number;
  year: number;
} {
  const date = new Date(
    Date.UTC(
      reference.getFullYear(),
      reference.getMonth(),
      reference.getDate(),
    ),
  );

  // Quinta-feira da semana atual decide o ano ISO.
  const dayNumber = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return { week, year: date.getUTCFullYear() };
}

/**
 * Formata uma data para exibição em português (ex.: "sexta-feira, 25/07/2026").
 */
export function formatFridayPtBr(date: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(date);
}
