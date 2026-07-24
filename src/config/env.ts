import 'dotenv/config';
import { z } from 'zod';

/**
 * Schema de validação das variáveis de ambiente.
 * Garante que a aplicação não inicie com configuração inválida.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY é obrigatória'),
  WAHA_URL: z.string().url('WAHA_URL deve ser uma URL válida'),
  WAHA_SESSION: z.string().min(1).default('default'),
  GROUP_CHAT_ID: z
    .string()
    .min(1, 'GROUP_CHAT_ID é obrigatório')
    .regex(/@g\.us$/, 'GROUP_CHAT_ID deve terminar com @g.us'),
  TIMEZONE: z.string().min(1).default('America/Sao_Paulo'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Falha ao validar variáveis de ambiente:\n${issues}\n` +
        'Verifique o arquivo .env (baseie-se no .env.example).',
    );
  }

  return parsed.data;
}

export const env = loadEnv();
