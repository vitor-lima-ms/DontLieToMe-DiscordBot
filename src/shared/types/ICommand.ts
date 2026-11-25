import {
  type BooleanCache,
  type CacheType,
  type CommandInteraction,
  type InteractionCallbackResponse,
  SlashCommandBuilder,
} from 'discord.js';

export default interface ICommand {
  data: SlashCommandBuilder;
  execute: (
    interaction: CommandInteraction,
  ) => Promise<InteractionCallbackResponse<BooleanCache<CacheType>>>;
}
