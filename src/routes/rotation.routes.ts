import { Router, type Request, type Response } from 'express';
import { rotationRepository } from '../repositories/RotationRepository';
import { participantRepository } from '../repositories/ParticipantRepository';
import { boloAgent } from '../agents/BoloAgent';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';

export const rotationRouter = Router();

// GET /rotation
rotationRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const rotation = await rotationRepository.getOrCreate();
    res.json(rotation);
  }),
);

// POST /rotation/next
// Avança a rotação para o próximo participante (sem enviar mensagens).
rotationRouter.post(
  '/next',
  asyncHandler(async (_req: Request, res: Response) => {
    const activeParticipants = await participantRepository.findActiveOrdered();
    if (activeParticipants.length === 0) {
      return res
        .status(409)
        .json({ message: 'Nenhum participante ativo para o rodízio.' });
    }

    const rotation = await rotationRepository.getOrCreate();
    const next = boloAgent.selectNextParticipant(
      activeParticipants,
      rotation.currentParticipantId,
    );

    const updated = await rotationRepository.setCurrentParticipant(next.id);
    logger.info(`Rotação avançada manualmente para: ${next.nome}.`);
    return res.json(updated);
  }),
);

// POST /rotation/reset
rotationRouter.post(
  '/reset',
  asyncHandler(async (_req: Request, res: Response) => {
    const updated = await rotationRepository.reset();
    logger.info('Rotação reiniciada manualmente.');
    return res.json(updated);
  }),
);
