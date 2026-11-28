const BITS_PER_SAMPLE = 16;
const HEADER_SIZE = 44;

export type PcmToWavOptions = { channels: number; sampleRate: number };

/** Empacota PCM s16le em um buffer WAV (RIFF) em memória. */
export default function pcmToWav(
  pcm: Buffer,
  { channels, sampleRate }: PcmToWavOptions,
): Buffer {
  const blockAlign = channels * (BITS_PER_SAMPLE / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const header = Buffer.alloc(HEADER_SIZE);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // tamanho do chunk fmt (PCM)
  header.writeUInt16LE(1, 20); // formato PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}
