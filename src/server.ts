import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { scheduler } from './scheduler/scheduler';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Servidor HTTP ouvindo na porta ${env.PORT}.`);
  });

  scheduler.start();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Recebido ${signal}. Encerrando aplicação...`);
    scheduler.stop();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error(
    'Falha ao iniciar a aplicação.',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
