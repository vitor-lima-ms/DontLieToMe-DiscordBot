import path from 'node:path';
import pinoLogger from '#shared/pinoLogger';
import { type Client, REST, Routes } from 'discord.js';
import { UTILITIES_FILES, UTILITIES_FOLDER } from '#commands/commandHandler';

const LOGGER = pinoLogger('commandDeploy');

export default async function commandDeploy(
  client: Client,
  token: string,
): Promise<void> {
  const DISCORD_CLIENT_ID = process.env['DISCORD_CLIENT_ID'];
  if (!DISCORD_CLIENT_ID) throw new Error('DISCORD_CLIENT_ID não foi definida');

  const DISCORD_GUILD_ID = process.env['DISCORD_GUILD_ID'];
  if (!DISCORD_GUILD_ID) throw new Error('DISCORD_GUILD_ID não foi definida');

  const commands = [];
  for (const file of UTILITIES_FILES) {
    const filePath = path.join(UTILITIES_FOLDER, file);
    if (!file.endsWith('.js')) {
      continue;
    }
    const command = (await import(filePath)).default;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      LOGGER.warn(`O comando em ${filePath} é invalido`);
    }
  }

  const rest = new REST().setToken(token);

  try {
    LOGGER.info(`Iniciando o deploy de ${client.commands.size} comando(s)`);

    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands },
    );

    LOGGER.info('Deploy bem sucedido!');
  } catch (error) {
    LOGGER.error(error);
  }
}
