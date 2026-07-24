import { Router, type Request, type Response } from 'express';
import { historyRepository } from '../repositories/HistoryRepository';
import { asyncHandler } from '../utils/asyncHandler';

export const historyRouter = Router();

// GET /history
historyRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const history = await historyRepository.findAll();
    res.json(history);
  }),
);

// GET /history/latest
historyRouter.get(
  '/latest',
  asyncHandler(async (_req: Request, res: Response) => {
    const latest = await historyRepository.findLatest();
    if (!latest) {
      return res.status(404).json({ message: 'Nenhum histórico encontrado.' });
    }
    return res.json(latest);
  }),
);
