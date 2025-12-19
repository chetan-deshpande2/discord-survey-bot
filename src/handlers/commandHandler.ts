import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import { ExtendedClient } from '../types';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('CommandHandler');

export async function loadCommands(client: ExtendedClient) {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const { command } = await import(filePath);

        if (command && 'data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            logger.debug(`Loaded command: ${command.data.name}`);
        } else {
            logger.warn(`Skipping invalid command file: ${file}`);
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        logger.info(`Syncing ${commands.length} slash commands`);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
            { body: commands },
        );

        logger.info('Slash commands synchronized successfully');
    } catch (error: any) {
        logger.error('Failed to sync slash commands', { error });
    }
}
