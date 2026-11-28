import { getVoiceConnection } from '@discordjs/voice';
import pinoLogger from '#shared/pinoLogger';
import {
  type CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

const LOGGER = pinoLogger('leaveVoiceChannel');

const leaveVoiceChannel = {
  data: new SlashCommandBuilder()
    .setName('leave-voice-channel')
    .setDescription('Sai do canal de voz'),
  execute: async (interaction: CommandInteraction) => {
    if (!interaction.guildId) {
      return;
    }

    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      await interaction.reply({
        content: 'Não estou conectado a nenhum canal de voz.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    connection.destroy();
    LOGGER.info('Conexão de voz encerrada');

    await interaction.reply({
      content: 'Desconectei',
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default leaveVoiceChannel;
