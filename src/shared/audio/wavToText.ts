import { enqueueOpenRouter } from '#shared/openRouterQueue';
import { OpenRouter } from '@openrouter/sdk';
import type { STTResponse } from '@openrouter/sdk/models';

const openRouter = new OpenRouter({
  apiKey: process.env['OPENROUTER_API_KEY'],
});

export default async function wavToText(buffer: Buffer): Promise<STTResponse> {
  return enqueueOpenRouter(() =>
    openRouter.stt.createTranscription({
      sttRequest: {
        inputAudio: { data: buffer.toString('base64'), format: 'wav' },
        language: 'pt-BR',
        model: 'microsoft/mai-transcribe-2',
      },
    }),
  );
}
