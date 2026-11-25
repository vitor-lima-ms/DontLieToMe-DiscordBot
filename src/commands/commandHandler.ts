import fs from 'node:fs';
import type ICommand from '#shared/types/ICommand';
import path from 'node:path';
import pinoLogger from '#shared/pinoLogger';
import { type Client, Collection } from 'discord.js';

const LOGGER = pinoLogger('commandHandler');

export const UTILITIES_FOLDER = path.join(import.meta.dirname, 'utility');
export const UTILITIES_FILES = fs.readdirSync(UTILITIES_FOLDER);

export default async function commandHandler(client: Client): Promise<void> {
  client.commands = new Collection<string, ICommand>();

  for (const file of UTILITIES_FILES) {
    const filePath = path.join(UTILITIES_FOLDER, file);
    if (!file.endsWith('.js')) {
      continue;
    }
    const command = (await import(filePath)).default;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      LOGGER.warn(`O comando em ${filePath} é invalido`);
    }
  }
}
