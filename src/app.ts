import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { participantsRouter } from './routes/participants.routes';
import { rotationRouter } from './routes/rotation.routes';
import { historyRouter } from './routes/history.routes';
import { agentRouter } from './routes/agent.routes';
import { logger } from './utils/logger';

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/participants', participantsRouter);
  app.use('/rotation', rotationRouter);
  app.use('/history', historyRouter);
  app.use('/agent', agentRouter);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Recurso não encontrado.' });
  });

  // Tratamento centralizado de erros.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Erro interno.';
    logger.error('Erro não tratado na requisição.', message);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  });

  return app;
}
