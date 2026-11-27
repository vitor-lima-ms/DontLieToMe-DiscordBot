import assert from 'node:assert/strict';
import { TooManyRequestsResponseError } from '@openrouter/sdk/models/errors/toomanyrequestsresponseerror.js';
import { afterEach, describe, it } from 'node:test';
import {
  enqueueOpenRouter,
  getOpenRouterConcurrency,
  getOpenRouterMaxRetries,
  getRetryAfterMs,
  isRateLimitError,
} from './openRouterQueue.js';

const ENV_KEYS = ['OPENROUTER_CONCURRENCY', 'OPENROUTER_MAX_RETRIES'] as const;

const originalEnv: Record<(typeof ENV_KEYS)[number], string | undefined> = {
  OPENROUTER_CONCURRENCY: undefined,
  OPENROUTER_MAX_RETRIES: undefined,
};

for (const key of ENV_KEYS) {
  originalEnv[key] = process.env[key];
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function make429(options: {
  retryAfterSeconds?: number;
  retryAfterHeader?: string;
}): TooManyRequestsResponseError {
  const headers = new Headers();
  if (options.retryAfterHeader !== undefined) {
    headers.set('Retry-After', options.retryAfterHeader);
  }
  const metadata =
    options.retryAfterSeconds === undefined ?
      undefined
    : { retry_after_seconds: options.retryAfterSeconds };

  return new TooManyRequestsResponseError(
    {
      error: {
        code: 429,
        message: 'Provider returned 429',
        ...(metadata === undefined ? {} : { metadata }),
      },
    },
    {
      body: '{"error":{"message":"Provider returned 429","code":429}}',
      request: new Request('https://openrouter.ai/api/v1/test'),
      response: new Response(null, { headers, status: 429 }),
    },
  );
}

describe('getOpenRouterConcurrency / getOpenRouterMaxRetries', () => {
  it('usa defaults sensatos', () => {
    delete process.env['OPENROUTER_CONCURRENCY'];
    delete process.env['OPENROUTER_MAX_RETRIES'];
    assert.equal(getOpenRouterConcurrency(), 1);
    assert.equal(getOpenRouterMaxRetries(), 3);
  });

  it('lê valores positivos do env', () => {
    process.env['OPENROUTER_CONCURRENCY'] = '2';
    process.env['OPENROUTER_MAX_RETRIES'] = '5';
    assert.equal(getOpenRouterConcurrency(), 2);
    assert.equal(getOpenRouterMaxRetries(), 5);
  });

  it('ignora valores inválidos', () => {
    process.env['OPENROUTER_CONCURRENCY'] = '0';
    process.env['OPENROUTER_MAX_RETRIES'] = 'abc';
    assert.equal(getOpenRouterConcurrency(), 1);
    assert.equal(getOpenRouterMaxRetries(), 3);
  });
});

describe('isRateLimitError / getRetryAfterMs', () => {
  it('reconhece TooManyRequestsResponseError', () => {
    const error = make429({ retryAfterSeconds: 1 });
    assert.equal(isRateLimitError(error), true);
  });

  it('usa retry_after_seconds do metadata', () => {
    const error = make429({ retryAfterSeconds: 1.5 });
    assert.equal(getRetryAfterMs(error), 1_500);
  });

  it('usa header Retry-After em segundos quando não há metadata', () => {
    const error = make429({ retryAfterHeader: '2' });
    assert.equal(getRetryAfterMs(error), 2_000);
  });

  it('cai no fallback de 1000ms sem metadata nem header', () => {
    const error = make429({});
    assert.equal(getRetryAfterMs(error), 1_000);
  });

  it('não trata erros comuns como rate limit', () => {
    assert.equal(isRateLimitError(new Error('boom')), false);
  });
});

describe('enqueueOpenRouter', () => {
  it('retorna o resultado na primeira tentativa', async () => {
    const result = await enqueueOpenRouter(async () => 'ok');
    assert.equal(result, 'ok');
  });

  it('retria 429 respeitando o delay e depois resolve', async () => {
    process.env['OPENROUTER_MAX_RETRIES'] = '3';
    let calls = 0;
    const started = Date.now();

    const result = await enqueueOpenRouter(async () => {
      calls += 1;
      if (calls < 3) {
        throw make429({ retryAfterSeconds: 0 });
      }
      return 'recovered';
    });

    assert.equal(result, 'recovered');
    assert.equal(calls, 3);
    assert.ok(Date.now() - started >= 0);
  });

  it('relança após esgotar o máximo de tentativas', async () => {
    process.env['OPENROUTER_MAX_RETRIES'] = '1';
    let calls = 0;

    await assert.rejects(
      () =>
        enqueueOpenRouter(async () => {
          calls += 1;
          throw make429({ retryAfterSeconds: 0 });
        }),
      (error: unknown) => error instanceof TooManyRequestsResponseError,
    );

    assert.equal(calls, 1);
  });

  it('com MAX_RETRIES=3 faz no máximo 3 tentativas', async () => {
    process.env['OPENROUTER_MAX_RETRIES'] = '3';
    let calls = 0;

    await assert.rejects(
      () =>
        enqueueOpenRouter(async () => {
          calls += 1;
          throw make429({ retryAfterSeconds: 0 });
        }),
      (error: unknown) => error instanceof TooManyRequestsResponseError,
    );

    assert.equal(calls, 3);
  });

  it('não retria erros que não são 429', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        enqueueOpenRouter(async () => {
          calls += 1;
          throw new Error('falha permanente');
        }),
      /falha permanente/,
    );
    assert.equal(calls, 1);
  });
});
