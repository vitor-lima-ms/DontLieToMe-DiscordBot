import { enqueueOpenRouter } from '#shared/openRouterQueue';
import type { OpenResponsesResult } from '@openrouter/sdk/models';
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: process.env['OPENROUTER_API_KEY'],
});

const SYSTEM_PROMPT = `
  Usar web search só para perguntas que pedem fato/atualidade ou afirmações verificáveis (fact-check).
  Ignorar cumprimentos, conversa casual, interjeições, trechos incompletos/STT lixo, sendo que, nestes casos, responder exatamente SKIP e não chamar a tool.
  Nos casos em que a pesquisa for realizada: responder de forma curta com veredito/fonte, em pt-BR.
`;

export default async function webSearch(
  prompt: string,
): Promise<OpenResponsesResult> {
  return enqueueOpenRouter(() =>
    openRouter.responses.send({
      responsesRequest: {
        input: [{ content: prompt, role: 'user' }],
        instructions: SYSTEM_PROMPT,
        model: 'openai/gpt-6-luna',
        tools: [{ type: 'openrouter:web_search' }],
      },
    }),
  );
}
