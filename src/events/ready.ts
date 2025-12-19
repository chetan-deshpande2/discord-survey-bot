import { Client, Events } from 'discord.js';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('Lifecycle');

export const event = {
    name: Events.ClientReady,
    once: true,
    execute(client: Client) {
        logger.info(`Ready! Logged in as ${client.user?.tag}`);
    },
};
