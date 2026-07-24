import type { Participant, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';

/**
 * Acesso ao banco de dados para a entidade Participant.
 * Não contém regras de negócio — apenas operações de persistência.
 */
export class ParticipantRepository {
  async findAll(): Promise<Participant[]> {
    return prisma.participant.findMany({
      orderBy: { ordem: 'asc' },
    });
  }

  /**
   * Retorna apenas participantes ativos, ordenados pelo campo `ordem`.
   * Essa ordenação é a base da lista circular do rodízio.
   */
  async findActiveOrdered(): Promise<Participant[]> {
    return prisma.participant.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
    });
  }

  async findById(id: string): Promise<Participant | null> {
    return prisma.participant.findUnique({ where: { id } });
  }

  async create(data: Prisma.ParticipantCreateInput): Promise<Participant> {
    return prisma.participant.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ParticipantUpdateInput,
  ): Promise<Participant> {
    return prisma.participant.update({ where: { id }, data });
  }

  /**
   * Desativação lógica: marca o participante como inativo em vez de removê-lo.
   */
  async deactivate(id: string): Promise<Participant> {
    return prisma.participant.update({
      where: { id },
      data: { ativo: false },
    });
  }
}

export const participantRepository = new ParticipantRepository();
