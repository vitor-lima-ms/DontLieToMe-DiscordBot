import { OpenRouterError } from '@openrouter/sdk/models/errors/openroutererror.js';
import pinoLogger from '#shared/pinoLogger';
import PQueue from 'p-queue';
import { TooManyRequestsResponseError } from '@openrouter/sdk/models/errors/toomanyrequestsresponseerror.js';

const LOGGER = pinoLogger('openRouterQueue');

const DEFAULT_CONCURRENCY = 1;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 1_000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function getOpenRouterConcurrency(): number {
  return parsePositiveInt(
    process.env['OPENROUTER_CONCURRENCY'],
    DEFAULT_CONCURRENCY,
  );
}

export function getOpenRouterMaxRetries(): number {
  return parsePositiveInt(
    process.env['OPENROUTER_MAX_RETRIES'],
    DEFAULT_MAX_RETRIES,
  );
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof TooManyRequestsResponseError) {
    return true;
  }
  return error instanceof OpenRouterError && error.statusCode === 429;
}

function retryAfterFromHeaders(headers: Headers | undefined): number | null {
  if (!headers) {
    return null;
  }
  const raw = headers.get('Retry-After');
  if (!raw) {
    return null;
  }
  const asSeconds = Number.parseFloat(raw);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.ceil(asSeconds * 1_000);
  }
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return null;
}

export function getRetryAfterMs(error: unknown): number {
  if (error instanceof TooManyRequestsResponseError) {
    const metadata = error.error.metadata;
    const fromMeta = metadata?.['retry_after_seconds'];
    if (
      typeof fromMeta === 'number'
      && Number.isFinite(fromMeta)
      && fromMeta >= 0
    ) {
      return Math.ceil(fromMeta * 1_000);
    }
    if (typeof fromMeta === 'string') {
      const parsed = Number.parseFloat(fromMeta);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.ceil(parsed * 1_000);
      }
    }
    const fromHeader = retryAfterFromHeaders(error.headers);
    if (fromHeader !== null) {
      return fromHeader;
    }
  } else if (error instanceof OpenRouterError && error.statusCode === 429) {
    const fromHeader = retryAfterFromHeaders(error.headers);
    if (fromHeader !== null) {
      return fromHeader;
    }
  }
  return DEFAULT_RETRY_AFTER_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const queue = new PQueue({ concurrency: getOpenRouterConcurrency() });

export async function enqueueOpenRouter<T>(task: () => Promise<T>): Promise<T> {
  const maxAttempts = getOpenRouterMaxRetries();

  return queue.add(async () => {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        return await task();
      } catch (error) {
        if (!isRateLimitError(error) || attempt >= maxAttempts) {
          throw error;
        }
        const delayMs = getRetryAfterMs(error);
        LOGGER.warn(
          { attempt, delayMs, maxAttempts },
          'OpenRouter 429 — aguardando Retry-After antes de retry',
        );
        await sleep(delayMs);
      }
    }
  });
}
