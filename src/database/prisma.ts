import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Instância única (singleton) do Prisma Client compartilhada
 * por toda a aplicação.
 */
export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Conexão com o banco de dados estabelecida.');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Conexão com o banco de dados encerrada.');
}
