import { EmbedBuilder } from 'discord.js';

export const EMBED_TITLE_MAX = 256;
export const EMBED_DESCRIPTION_MAX = 4096;
export const FACT_CHECK_EMBED_COLOR = 0x57f287;

export function truncateForEmbed(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 1) {
    return '…'.slice(0, maxLength);
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export function buildFactCheckEmbed(
  question: string,
  answer: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setAuthor({ name: 'Pergunta' })
    .setTitle(truncateForEmbed(question, EMBED_TITLE_MAX))
    .setDescription(truncateForEmbed(answer, EMBED_DESCRIPTION_MAX))
    .setColor(FACT_CHECK_EMBED_COLOR)
    .setTimestamp();
}
