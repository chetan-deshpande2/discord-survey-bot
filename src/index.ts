import 'reflect-metadata';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { startAlertService } from './services/alertService';
import { ExtendedClient } from './types';

export const instanceId = Math.random().toString(36).substring(7);
// Initial log handled in init() with chalk

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
}) as ExtendedClient;

client.commands = new Collection();

// Global error handlers to keep the process alive
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});

client.on('error', (err) => console.error(`Client Error (${instanceId}):`, err));
client.on('shardError', (err) => console.error(`Gateway Connection Issue (${instanceId}):`, err));

async function init() {
    const chalk = (await import('chalk')).default;

    try {
        console.log(chalk.cyan(`[Startup] ID: ${instanceId}`));

        await connectDatabase();
        console.log(chalk.green('Connected to database'));

        await loadEvents(client);
        await loadCommands(client);
        console.log(chalk.green(`Loaded ${client.commands.size} commands and events`));

        startAlertService(client);
        console.log(chalk.yellow('Price monitoring active'));

        await client.login(process.env.DISCORD_TOKEN);
        console.log(chalk.blue.bold(`Logged in as ${client.user?.tag}`));
    } catch (err) {
        console.error(chalk.red.bold('Initialization failed:'), err);
        process.exit(1);
    }
}

init();
