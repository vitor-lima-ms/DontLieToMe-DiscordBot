const DEFAULT_WAKE_WORD = 'Hey Bot';

const DEFAULT_HEY_BOT_ALIASES = ['ei bot', 'rei bot'];

export type WakeWordResult =
  { triggered: false } | { remainder: string; triggered: true };

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getWakeWord(): string {
  const fromEnv = process.env['WAKE_WORD']?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_WAKE_WORD;
}

export function getWakeWordCandidates(
  wakeWord: string = getWakeWord(),
): string[] {
  const primary = normalize(wakeWord);
  const candidates: string[] = [];

  if (primary) {
    candidates.push(primary);
  }

  if (primary === 'hey bot') {
    for (const alias of DEFAULT_HEY_BOT_ALIASES) {
      const normalizedAlias = normalize(alias);
      if (normalizedAlias && !candidates.includes(normalizedAlias)) {
        candidates.push(normalizedAlias);
      }
    }
  }

  const fromEnv = process.env['WAKE_WORD_ALIASES']?.split('|') ?? [];
  for (const alias of fromEnv) {
    const normalizedAlias = normalize(alias);
    if (normalizedAlias && !candidates.includes(normalizedAlias)) {
      candidates.push(normalizedAlias);
    }
  }

  return candidates;
}

export function extractAfterWakeWord(
  text: string,
  wakeWord: string,
): WakeWordResult {
  const normalizedText = normalize(text);
  if (!normalizedText) {
    return { triggered: false };
  }

  const candidates = getWakeWordCandidates(wakeWord);
  if (candidates.length === 0) {
    return { triggered: false };
  }

  const haystack = ` ${normalizedText} `;
  let bestIdx = Infinity;
  let bestLen = 0;

  for (const candidate of candidates) {
    const needle = ` ${candidate} `;
    const idx = haystack.indexOf(needle);
    if (idx !== -1 && idx < bestIdx) {
      bestIdx = idx;
      bestLen = needle.length;
    }
  }

  if (bestIdx === Infinity) {
    return { triggered: false };
  }

  const remainder = haystack.slice(bestIdx + bestLen).trim();

  return { remainder, triggered: true };
}
