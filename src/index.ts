import 'reflect-metadata';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import { startAlertService } from './services/alertService';
import { ExtendedClient } from './types';

// Instance identifier exported for logger and context
export const instanceId = Math.random().toString(36).substring(7);

dotenv.config();

import { logger } from './utils/logger';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
}) as ExtendedClient;

client.commands = new Collection();

// Global resilience handlers
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', { reason });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
});

client.on('error', (err) => logger.error('Discord Client Error', { error: err }));
client.on('shardError', (err) => logger.error('Discord Shard Connection Issue', { error: err }));

async function init() {
    try {
        logger.info('Initializing bot startup sequence');

        await connectDatabase();
        logger.info('Database connection established');

        await loadEvents(client);
        await loadCommands(client);
        logger.info(`Ready: ${client.commands.size} commands and events registered`);

        startAlertService(client);
        logger.info('Price alert background service active');

        await client.login(process.env.DISCORD_TOKEN);
        logger.info(`Bot successfully logged in as ${client.user?.tag}`);
    } catch (err) {
        logger.error('Critical initialization failure', { error: err });
        process.exit(1);
    }
}

init();
