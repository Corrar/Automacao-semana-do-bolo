/**
 * Converte um número de telefone em um chatId privado do WhatsApp.
 * Remove qualquer caractere não numérico e adiciona o sufixo "@c.us".
 *
 * Exemplo: "+55 (11) 99999-9999" -> "5511999999999@c.us"
 */
export function toPrivateChatId(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  if (!digits) {
    throw new Error(`Telefone inválido: "${telefone}"`);
  }
  return `${digits}@c.us`;
}
