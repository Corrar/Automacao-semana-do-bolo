import type { Participant, Rotation } from '@prisma/client';
import { prisma } from '../database/prisma';

export type RotationWithParticipant = Rotation & {
  currentParticipant: Participant | null;
};

/**
 * Acesso ao banco de dados para a entidade Rotation.
 * A rotação é persistida (single-row) e representa o último responsável.
 */
export class RotationRepository {
  /**
   * Garante que exista sempre uma única linha de rotação.
   */
  async getOrCreate(): Promise<RotationWithParticipant> {
    const existing = await prisma.rotation.findFirst({
      include: { currentParticipant: true },
    });

    if (existing) {
      return existing;
    }

    return prisma.rotation.create({
      data: {},
      include: { currentParticipant: true },
    });
  }

  async setCurrentParticipant(
    participantId: string | null,
  ): Promise<RotationWithParticipant> {
    const rotation = await this.getOrCreate();

    return prisma.rotation.update({
      where: { id: rotation.id },
      data: { currentParticipantId: participantId },
      include: { currentParticipant: true },
    });
  }

  async reset(): Promise<RotationWithParticipant> {
    return this.setCurrentParticipant(null);
  }
}

export const rotationRepository = new RotationRepository();
