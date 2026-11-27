import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EMBED_DESCRIPTION_MAX,
  EMBED_TITLE_MAX,
  FACT_CHECK_EMBED_COLOR,
  buildFactCheckEmbed,
  truncateForEmbed,
} from './factCheckEmbed.js';

describe('truncateForEmbed', () => {
  it('devolve o texto intacto quando cabe no limite', () => {
    assert.equal(truncateForEmbed('curto', 10), 'curto');
  });

  it('trunca e acrescenta reticências ao exceder o limite', () => {
    assert.equal(truncateForEmbed('abcdefghij', 5), 'abcd…');
    assert.equal(truncateForEmbed('abcdefghij', 5).length, 5);
  });
});

describe('buildFactCheckEmbed', () => {
  it('preenche author, title, description e cor nos casos curtos', () => {
    const embed = buildFactCheckEmbed(
      'quais os jogos do brasileirao',
      'Neste fim de semana: Flamengo x Palmeiras',
    );
    const data = embed.toJSON();

    assert.equal(data.author?.name, 'Pergunta');
    assert.equal(data.title, 'quais os jogos do brasileirao');
    assert.equal(
      data.description,
      'Neste fim de semana: Flamengo x Palmeiras',
    );
    assert.equal(data.color, FACT_CHECK_EMBED_COLOR);
    assert.ok(data.timestamp);
  });

  it('trunca title em 256 e description em 4096', () => {
    const longTitle = 'q'.repeat(EMBED_TITLE_MAX + 50);
    const longDescription = 'r'.repeat(EMBED_DESCRIPTION_MAX + 50);
    const embed = buildFactCheckEmbed(longTitle, longDescription);
    const data = embed.toJSON();

    assert.equal(data.title?.length, EMBED_TITLE_MAX);
    assert.equal(data.title?.endsWith('…'), true);
    assert.equal(data.description?.length, EMBED_DESCRIPTION_MAX);
    assert.equal(data.description?.endsWith('…'), true);
  });
});
