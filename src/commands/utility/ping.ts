import {
  type CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

const ping = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde com Pong!'),
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply({
      content: 'Pong!',
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default ping;
