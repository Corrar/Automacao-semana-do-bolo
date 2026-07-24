import type { History, Participant, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';

export type HistoryWithParticipant = History & {
  participant: Participant;
};

/**
 * Acesso ao banco de dados para a entidade History.
 * O par (week, year) é único e garante a idempotência semanal.
 */
export class HistoryRepository {
  async create(data: Prisma.HistoryCreateInput): Promise<History> {
    return prisma.history.create({ data });
  }

  async findAll(): Promise<HistoryWithParticipant[]> {
    return prisma.history.findMany({
      include: { participant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatest(): Promise<HistoryWithParticipant | null> {
    return prisma.history.findFirst({
      include: { participant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Verifica se já existe histórico registrado para uma semana/ano.
   * Usado pelo agente para não executar duas vezes na mesma semana.
   */
  async findByWeek(week: number, year: number): Promise<History | null> {
    return prisma.history.findUnique({
      where: { week_year: { week, year } },
    });
  }
}

export const historyRepository = new HistoryRepository();
