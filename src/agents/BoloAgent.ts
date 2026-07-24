import type { Participant } from '@prisma/client';
import { participantRepository } from '../repositories/ParticipantRepository';
import { rotationRepository } from '../repositories/RotationRepository';
import { historyRepository } from '../repositories/HistoryRepository';
import {
  geminiService,
  type GeneratedMessages,
} from '../services/GeminiService';
import { whatsAppService } from '../services/WhatsAppService';
import {
  formatFridayPtBr,
  getIsoWeekAndYear,
  getNextFriday,
} from '../utils/date';
import { toPrivateChatId } from '../utils/phone';
import { logger } from '../utils/logger';

export interface BoloAgentResult {
  executed: boolean;
  reason?: string;
  participant?: Participant;
  week: number;
  year: number;
  messages?: GeneratedMessages;
}

/**
 * BoloAgent concentra TODA a regra de negócio do rodízio.
 * Services (Gemini/WAHA) e Repositories não conhecem regras — apenas executam.
 */
export class BoloAgent {
  /**
   * Seleciona o próximo participante usando uma lista circular.
   * Participantes inativos já vêm filtrados; se o atual não estiver mais
   * na lista, recomeça do início.
   */
  selectNextParticipant(
    activeParticipants: Participant[],
    currentParticipantId: string | null,
  ): Participant {
    if (activeParticipants.length === 0) {
      throw new Error('Não há participantes ativos para o rodízio.');
    }

    if (!currentParticipantId) {
      return activeParticipants[0];
    }

    const currentIndex = activeParticipants.findIndex(
      (participant) => participant.id === currentParticipantId,
    );

    if (currentIndex === -1) {
      // Responsável anterior não está mais ativo: recomeça do primeiro.
      return activeParticipants[0];
    }

    const nextIndex = (currentIndex + 1) % activeParticipants.length;
    return activeParticipants[nextIndex];
  }

  /**
   * Executa o fluxo completo do agente.
   * @param reference data de referência (default: agora) — facilita testes.
   */
  async run(reference: Date = new Date()): Promise<BoloAgentResult> {
    logger.info('Agente "Bolo da Sexta" iniciado.');

    const { week, year } = getIsoWeekAndYear(reference);

    // Passo 0: idempotência — não executar duas vezes na mesma semana.
    const existing = await historyRepository.findByWeek(week, year);
    if (existing) {
      const reason = `Histórico já existe para a semana ${week}/${year}. Execução ignorada.`;
      logger.warn(reason);
      return { executed: false, reason, week, year };
    }

    // Passo 1 e 2: buscar participantes ativos.
    const activeParticipants = await participantRepository.findActiveOrdered();
    if (activeParticipants.length === 0) {
      const reason = 'Nenhum participante ativo encontrado.';
      logger.warn(reason);
      return { executed: false, reason, week, year };
    }

    // Passo 3: buscar último responsável.
    const rotation = await rotationRepository.getOrCreate();

    // Passo 4: selecionar próximo participante.
    const next = this.selectNextParticipant(
      activeParticipants,
      rotation.currentParticipantId,
    );
    logger.info(`Participante escolhido: ${next.nome} (id=${next.id}).`);

    // Passo 5: calcular a próxima sexta-feira.
    const friday = getNextFriday(reference);
    const fridayLabel = formatFridayPtBr(friday);

    // Passo 6: solicitar mensagens ao Gemini.
    const messages = await geminiService.generateMessages({
      nome: next.nome,
      sexta: fridayLabel,
    });
    logger.info('Mensagens geradas.', {
      group: messages.group,
      private: messages.private,
    });

    // Passos 7 e 8: enviar mensagens via WAHA.
    // Se o envio falhar, a rotação NÃO é atualizada.
    try {
      await whatsAppService.sendGroupMessage(messages.group);
      logger.info('Mensagem enviada ao grupo.');

      await whatsAppService.sendPrivateMessage(
        toPrivateChatId(next.telefone),
        messages.private,
      );
      logger.info('Mensagem privada enviada.');
    } catch (error) {
      logger.error(
        'Falha ao enviar mensagens via WAHA. Rotação não será atualizada.',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }

    // Passo 9: salvar histórico.
    await historyRepository.create({
      week,
      year,
      groupMessage: messages.group,
      privateMessage: messages.private,
      participant: { connect: { id: next.id } },
    });
    logger.info('Histórico salvo.');

    // Passo 10: atualizar a rotação (somente após envio bem-sucedido).
    await rotationRepository.setCurrentParticipant(next.id);
    logger.info('Rotação atualizada.');

    logger.info('Agente "Bolo da Sexta" finalizado com sucesso.');
    return {
      executed: true,
      participant: next,
      week,
      year,
      messages,
    };
  }
}

export const boloAgent = new BoloAgent();
