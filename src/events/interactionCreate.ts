import { Events, Interaction, MessageFlags } from 'discord.js';
import { ExtendedClient } from '../types';
import { handleCreateSurveyModal } from '../commands/createSurvey';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('InteractionHandler');

export const event = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction) {
        const client = interaction.client as ExtendedClient;

        // Structured log for every interaction
        logger.debug('Received interaction', {
            id: interaction.id,
            user: interaction.user.tag,
            type: interaction.type
        });

        if (interaction.isModalSubmit()) {
            const handled = await handleCreateSurveyModal(interaction);
            if (handled) return;
        }

        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
                logger.info('Command executed successfully', {
                    command: interaction.commandName,
                    user: interaction.user.tag
                });
            } catch (error) {
                logger.error('Error executing command', {
                    command: interaction.commandName,
                    error
                });

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                logger.error('Autocomplete Error', { command: interaction.commandName, error });
            }
        }
    },
};
