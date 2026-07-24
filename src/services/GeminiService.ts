import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Estrutura das mensagens geradas.
 */
export interface GeneratedMessages {
  group: string;
  private: string;
}

const geminiResponseSchema = z.object({
  group: z.string().min(1),
  private: z.string().min(1),
});

interface GenerateInput {
  nome: string;
  sexta: string;
}

/**
 * Serviço isolado de integração com o Google Gemini.
 * NÃO contém regra de negócio: apenas recebe dados e devolve mensagens.
 * Em caso de falha, retorna mensagens padrão para não travar o fluxo.
 */
export class GeminiService {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string = env.GEMINI_API_KEY) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private buildPrompt({ nome, sexta }: GenerateInput): string {
    return `Você é um assistente divertido.

Toda sexta-feira um grupo de amigos se reúne para comer bolo.

Crie duas mensagens:

1. Para o grupo.
2. Para o responsável.

Regras:
- divertida
- amigável
- poucos emojis
- até 80 palavras
- não mencionar IA
- não mencionar algoritmo

Responsável:
${nome}

Data:
${sexta}

Responda APENAS com um JSON válido no formato:
{"group": "...", "private": "..."}`;
  }

  /**
   * Mensagens padrão utilizadas quando a IA falha.
   */
  static defaultMessages({ nome, sexta }: GenerateInput): GeneratedMessages {
    return {
      group: `Pessoal, chegou a hora do bolo da sexta! ${sexta}. Dessa vez quem traz o bolo é o(a) ${nome}. Bora garantir a mesa cheia!`,
      private: `Oi, ${nome}! Essa semana o bolo da sexta (${sexta}) fica por sua conta. Conto com você pra adoçar o encontro!`,
    };
  }

  private extractJson(text: string): unknown {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Resposta da IA não contém JSON válido.');
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }

  async generateMessages(input: GenerateInput): Promise<GeneratedMessages> {
    try {
      const model = this.client.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent(this.buildPrompt(input));
      const text = result.response.text();

      const parsed = geminiResponseSchema.parse(this.extractJson(text));
      logger.info('Mensagens geradas pela IA com sucesso.');
      return parsed;
    } catch (error) {
      logger.warn(
        'Falha ao gerar mensagens via Gemini. Usando mensagens padrão.',
        error instanceof Error ? error.message : error,
      );
      return GeminiService.defaultMessages(input);
    }
  }
}

export const geminiService = new GeminiService();
