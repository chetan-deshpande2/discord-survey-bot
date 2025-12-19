import { Events, Interaction, MessageFlags } from 'discord.js';
import { ExtendedClient } from '../types';
import { handleCreateSurveyModal } from '../commands/createSurvey';
import { instanceId } from '../index';

export const event = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction) {
        const client = interaction.client as ExtendedClient;

        // Helpful for debugging multi-instance issues if they crop up
        console.log(`[Interaction] ${interaction.id} | User: ${interaction.user.tag} | Instance: ${instanceId}`);

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const handled = await handleCreateSurveyModal(interaction);
            if (handled) return;
        }

        // Skip button and select menu interactions - they're handled by message collectors
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(error);
            }
        }
    },
};
