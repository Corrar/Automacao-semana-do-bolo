import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { participantRepository } from '../repositories/ParticipantRepository';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';

export const participantsRouter = Router();

const createParticipantSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(8),
  ordem: z.coerce.number().int().nonnegative(),
  ativo: z.boolean().optional(),
});

const updateParticipantSchema = createParticipantSchema.partial();

// GET /participants
participantsRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const participants = await participantRepository.findAll();
    res.json(participants);
  }),
);

// POST /participants
participantsRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createParticipantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const participant = await participantRepository.create(parsed.data);
    logger.info(`Participante criado: ${participant.nome}.`);
    return res.status(201).json(participant);
  }),
);

// PUT /participants/:id
participantsRouter.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateParticipantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const existing = await participantRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Participante não encontrado.' });
    }

    const participant = await participantRepository.update(
      req.params.id,
      parsed.data,
    );
    return res.json(participant);
  }),
);

// DELETE /participants/:id (desativação lógica)
participantsRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await participantRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Participante não encontrado.' });
    }

    const participant = await participantRepository.deactivate(req.params.id);
    logger.info(`Participante desativado: ${participant.nome}.`);
    return res.json(participant);
  }),
);
