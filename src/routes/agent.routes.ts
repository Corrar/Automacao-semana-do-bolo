import { Router, type Request, type Response } from 'express';
import { boloAgent } from '../agents/BoloAgent';
import { asyncHandler } from '../utils/asyncHandler';

export const agentRouter = Router();

// POST /agent/run
// Dispara o agente manualmente (útil para testes/execução sob demanda).
// Respeita a idempotência semanal do BoloAgent.
agentRouter.post(
  '/run',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await boloAgent.run();
    const status = result.executed ? 200 : 409;
    return res.status(status).json(result);
  }),
);
