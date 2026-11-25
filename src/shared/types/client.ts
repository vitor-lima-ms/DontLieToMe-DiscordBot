import { Collection } from 'discord.js';
import type ICommand from '#shared/types/ICommand';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, ICommand>;
  }
}