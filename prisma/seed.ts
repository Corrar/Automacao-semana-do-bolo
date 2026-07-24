import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Popula o banco com os participantes de exemplo da especificação.
 * Ajuste os telefones para números reais antes de usar em produção.
 */
async function main(): Promise<void> {
  const participants = [
    { nome: 'Bruno', telefone: '5511990000001', ordem: 1 },
    { nome: 'João', telefone: '5511990000002', ordem: 2 },
    { nome: 'Pedro', telefone: '5511990000003', ordem: 3 },
    { nome: 'Carlos', telefone: '5511990000004', ordem: 4 },
  ];

  for (const participant of participants) {
    const existing = await prisma.participant.findFirst({
      where: { nome: participant.nome },
    });
    if (!existing) {
      await prisma.participant.create({ data: participant });
    }
  }

  // Garante a linha única de rotação.
  const rotation = await prisma.rotation.findFirst();
  if (!rotation) {
    await prisma.rotation.create({ data: {} });
  }

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
