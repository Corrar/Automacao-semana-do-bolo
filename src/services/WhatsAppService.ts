import { env } from '../config/env';
import { logger } from '../utils/logger';

interface WahaSendPayload {
  session: string;
  chatId: string;
  text: string;
}

/**
 * Serviço isolado de integração com o WAHA (WhatsApp HTTP API).
 * NÃO contém regra de negócio: apenas envia mensagens.
 */
export class WhatsAppService {
  private readonly baseUrl: string;
  private readonly session: string;

  constructor(
    baseUrl: string = env.WAHA_URL,
    session: string = env.WAHA_SESSION,
  ) {
    // Remove barra final para evitar URLs duplicadas.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.session = session;
  }

  private async sendText(chatId: string, text: string): Promise<void> {
    const payload: WahaSendPayload = {
      session: this.session,
      chatId,
      text,
    };

    const response = await fetch(`${this.baseUrl}/api/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `WAHA respondeu com status ${response.status}: ${body || 'sem corpo'}`,
      );
    }
  }

  /**
   * Envia a mensagem para o grupo configurado (GROUP_CHAT_ID).
   */
  async sendGroupMessage(text: string): Promise<void> {
    await this.sendText(env.GROUP_CHAT_ID, text);
    logger.info(`Mensagem enviada ao grupo ${env.GROUP_CHAT_ID}.`);
  }

  /**
   * Envia a mensagem privada para o responsável.
   * @param chatId identificador no formato 551199999999@c.us
   */
  async sendPrivateMessage(chatId: string, text: string): Promise<void> {
    await this.sendText(chatId, text);
    logger.info(`Mensagem privada enviada para ${chatId}.`);
  }
}

export const whatsAppService = new WhatsAppService();
