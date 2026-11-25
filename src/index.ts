import '#shared/types/client';
import 'dotenv/config';
import commandDeploy from '#commands/commandDeploy';
import commandHandler from '#commands/commandHandler';
import pinoLogger from '#shared/pinoLogger';
import {
  Client,
  Events,
  GatewayIntentBits,
  type InteractionReplyOptions,
  MessageFlags,
} from 'discord.js';

const LOGGER = pinoLogger('index');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
client.once(Events.ClientReady, (readyClient) => {
  LOGGER.info(`Pronto! Logado como ${readyClient.user.tag}`);
});

await commandHandler(client);
const token = process.env['DISCORD_BOT_TOKEN'];
if (!token) throw new Error('DISCORD_BOT_TOKEN não foi definida');
await commandDeploy(client, token);

await client.login(token);

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    LOGGER.error(
      `Nenhum comando chamado ${interaction.commandName} foi encontrado`,
    );
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    LOGGER.error(error);

    const feedback: InteractionReplyOptions = {
      content: 'Erro ao executar o comando!',
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(feedback);
    } else {
      await interaction.reply(feedback);
    }
  }
});
