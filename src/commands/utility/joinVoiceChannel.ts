import pcmToWav from '#shared/audio/pcmToWav';
import pinoLogger from '#shared/pinoLogger';
import prism from 'prism-media';
import wavToText from '#shared/audio/wavToText';
import webSearch from '#shared/webSearch';
import {
  type CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import {
  EndBehaviorType,
  joinVoiceChannel as jvc,
  VoiceConnectionStatus,
} from '@discordjs/voice';

const LOGGER = pinoLogger('joinVoiceChannel');

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2; // s16le
const MIN_AUDIO_SECONDS = 0.5;
const MIN_PCM_BYTES =
  SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * MIN_AUDIO_SECONDS;

const joinVoiceChannel = {
  data: new SlashCommandBuilder()
    .setName('join-voice-channel')
    .setDescription('Entra no canal de voz'),
  execute: async (interaction: CommandInteraction) => {
    if (!interaction.guild || !interaction.guildId) {
      return;
    }

    const member = interaction.member;
    if (!member || !('voice' in member) || !member.voice.channelId) {
      await interaction.reply({
        content: 'Você precisa estar em um canal de voz.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const voiceConnection = jvc({
      adapterCreator: interaction.guild.voiceAdapterCreator,
      channelId: member.voice.channelId,
      guildId: interaction.guildId,
      selfDeaf: false,
      selfMute: false,
    });

    interaction.reply({ content: 'Conectei', flags: MessageFlags.Ephemeral });

    voiceConnection.on(VoiceConnectionStatus.Ready, () => {
      LOGGER.info('Conexão de voz pronta');

      const activeUsers = new Set<string>();

      voiceConnection.receiver.speaking.on('start', (userId) => {
        if (activeUsers.has(userId)) {
          return;
        }
        activeUsers.add(userId);

        const opusStream = voiceConnection.receiver.subscribe(userId, {
          end: { behavior: EndBehaviorType.AfterSilence, duration: 1_000 },
        });

        const pcmStream = opusStream.pipe(
          new prism.opus.Decoder({
            channels: CHANNELS,
            frameSize: 960, // 20ms @ 48kHz
            rate: SAMPLE_RATE,
          }),
        );

        const chunks: Buffer[] = [];
        pcmStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pcmStream.on('end', async () => {
          activeUsers.delete(userId);

          const pcm = Buffer.concat(chunks);
          if (pcm.byteLength < MIN_PCM_BYTES) {
            LOGGER.info(
              { pcmBytes: pcm.byteLength, userId },
              'Áudio muito curto, ignorado',
            );
            return;
          }

          const wav = pcmToWav(pcm, {
            channels: CHANNELS,
            sampleRate: SAMPLE_RATE,
          });

          const transcription = await wavToText(wav);

          if (transcription.text) {
            const webSearchResult = await webSearch(transcription.text);

            const messageItem = webSearchResult.output.find(
              (outputItem) => outputItem.type === 'message',
            );
            if (!messageItem) {
              LOGGER.error('Sem outputItem.type === "message"');
              return;
            }

            const output = messageItem.content.find(
              (contentItem) => contentItem.type === 'output_text',
            );
            if (!output) {
              LOGGER.error('Sem contentItem.type === "output_text"');
              return;
            }
            if (output.text.trim().toUpperCase() === 'SKIP') {
              LOGGER.info('Web Search skippada');
            } else {
              await interaction.followUp(
                `Pergunta: ${transcription.text}\nResposta: ${output.text}`,
              );
            }
          } else {
            LOGGER.info('transcription.text é falsy');
          }
        });

        pcmStream.on('error', (error) => {
          activeUsers.delete(userId);
          LOGGER.error({ error, userId }, 'Erro no stream PCM');
        });
      });
    });
  },
};

export default joinVoiceChannel;
