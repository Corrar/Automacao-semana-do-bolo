import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { boloAgent } from '../agents/BoloAgent';
import { logger } from '../utils/logger';

// Quarta-feira às 20:00 -> "minuto hora * * dia-da-semana(3)"
const CRON_EXPRESSION = '0 20 * * 3';

/**
 * Agendador responsável por disparar o BoloAgent toda quarta às 20:00
 * no fuso horário configurado.
 */
export class Scheduler {
  private task: ScheduledTask | null = null;

  start(): void {
    if (this.task) {
      logger.warn('Scheduler já está em execução.');
      return;
    }

    this.task = cron.schedule(
      CRON_EXPRESSION,
      () => {
        void this.execute();
      },
      {
        timezone: env.TIMEZONE,
      },
    );

    logger.info(
      `Scheduler iniciado (quarta-feira 20:00, timezone ${env.TIMEZONE}).`,
    );
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Scheduler parado.');
    }
  }

  /**
   * Executa o agente e trata quaisquer exceções para não derrubar o processo.
   */
  private async execute(): Promise<void> {
    try {
      await boloAgent.run();
    } catch (error) {
      logger.error(
        'Erro durante a execução agendada do BoloAgent.',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

export const scheduler = new Scheduler();
