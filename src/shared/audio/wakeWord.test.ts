import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { extractAfterWakeWord, getWakeWordCandidates } from './wakeWord.js';

const ENV_KEYS = ['WAKE_WORD', 'WAKE_WORD_ALIASES'] as const;

const originalEnv: Record<(typeof ENV_KEYS)[number], string | undefined> = {
  WAKE_WORD: undefined,
  WAKE_WORD_ALIASES: undefined,
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

describe('extractAfterWakeWord', () => {
  it('dispara com a frase canônica e devolve o resto', () => {
    const result = extractAfterWakeWord(
      'Hey Bot qual a capital do Brasil?',
      'Hey Bot',
    );
    assert.deepEqual(result, {
      remainder: 'qual a capital do brasil',
      triggered: true,
    });
  });

  it('dispara com vírgula entre as palavras (Hey, bot)', () => {
    const result = extractAfterWakeWord(
      'Hey, bot quem ganhou o jogo?',
      'Hey Bot',
    );
    assert.deepEqual(result, {
      remainder: 'quem ganhou o jogo',
      triggered: true,
    });
  });

  it('dispara com Ei bot', () => {
    const result = extractAfterWakeWord('Ei bot busca isso', 'Hey Bot');
    assert.deepEqual(result, { remainder: 'busca isso', triggered: true });
  });

  it('dispara com Ei, Bot', () => {
    const result = extractAfterWakeWord('Ei, Bot busca isso', 'Hey Bot');
    assert.deepEqual(result, { remainder: 'busca isso', triggered: true });
  });

  it('dispara com Rei bot', () => {
    const result = extractAfterWakeWord('Rei bot busca isso', 'Hey Bot');
    assert.deepEqual(result, { remainder: 'busca isso', triggered: true });
  });

  it('ignora enunciado sem gatilho', () => {
    const result = extractAfterWakeWord('qual a capital do Brasil?', 'Hey Bot');
    assert.deepEqual(result, { triggered: false });
  });

  it('dispara com só a wake word e resto vazio', () => {
    const result = extractAfterWakeWord('Hey Bot', 'Hey Bot');
    assert.deepEqual(result, { remainder: '', triggered: true });
  });

  it('aceita aliases via WAKE_WORD_ALIASES', () => {
    process.env['WAKE_WORD_ALIASES'] = 'Oi Bot|Eae Bot';
    const result = extractAfterWakeWord('Oi Bot me ajuda', 'Hey Bot');
    assert.deepEqual(result, { remainder: 'me ajuda', triggered: true });
  });

  it('WAKE_WORD custom não herda defaults de hey bot', () => {
    process.env['WAKE_WORD'] = 'Ok Computer';
    assert.deepEqual(getWakeWordCandidates('Ok Computer'), ['ok computer']);
    assert.deepEqual(extractAfterWakeWord('Ei bot busca isso', 'Ok Computer'), {
      triggered: false,
    });
    assert.deepEqual(
      extractAfterWakeWord('Ok Computer busca isso', 'Ok Computer'),
      { remainder: 'busca isso', triggered: true },
    );
  });
});
