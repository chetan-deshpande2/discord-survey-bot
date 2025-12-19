import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import { ExtendedClient } from '../types';

export async function loadCommands(client: ExtendedClient) {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const { command } = await import(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }

    // Registry
    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        console.log(`Syncing ${commands.length} slash commands...`);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
            { body: commands },
        );
    } catch (error: any) {
        console.error(error);
    }
}
