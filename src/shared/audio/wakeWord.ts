const DEFAULT_WAKE_WORD = 'Hey Bot';

export type WakeWordResult =
  { triggered: false } | { remainder: string; triggered: true };

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getWakeWord(): string {
  const fromEnv = process.env['WAKE_WORD']?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_WAKE_WORD;
}

export function extractAfterWakeWord(
  text: string,
  wakeWord: string,
): WakeWordResult {
  const normalizedText = normalize(text);
  const normalizedWake = normalize(wakeWord);
  if (!normalizedText || !normalizedWake) {
    return { triggered: false };
  }

  const pattern = escapeRegExp(normalizedWake).replace(/\s+/g, '\\s+');
  const re = new RegExp(`${pattern}[\\s,.:;!?\\-]*`, 'i');
  const match = re.exec(normalizedText);
  if (!match) {
    return { triggered: false };
  }

  const remainder = normalize(
    normalizedText.slice(match.index + match[0].length),
  );

  return { remainder, triggered: true };
}
