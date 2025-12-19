import { SlashCommandBuilder } from 'discord.js';
import { AppDataSource } from '../config/database';
import { Alert, AlertCondition } from '../models/Alert';
import { ensureUser } from '../services/userService';
import { getPrice } from '../utils/marketData';
import { formatCurrency } from '../utils/formatters';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('AlertCommand');

export const command = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Set a price alert')
        .addStringOption(option =>
            option.setName('symbol')
                .setDescription('The symbol to monitor (e.g. BTC)')
                .setRequired(true)
                .setAutocomplete(true))
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('The target price')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('condition')
                .setDescription('Trigger when price is ABOVE or BELOW this value')
                .setRequired(true)
                .addChoices(
                    { name: 'Above', value: 'ABOVE' },
                    { name: 'Below', value: 'BELOW' }
                )),
    async autocomplete(interaction: any) {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );

            const focused = interaction.options.getFocused();
            const choices = [
                'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'USDC', 'XRP', 'ADA', 'AVAX', 'DOGE',
                'DOT', 'TRX', 'MATIC', 'LTC', 'SHIB', 'DAI', 'BCH', 'LEO', 'UNI', 'ATOM'
            ];

            const filtered = choices.filter(c => c.toLowerCase().startsWith(focused.toLowerCase()));

            await Promise.race([
                interaction.respond(filtered.map(c => ({ name: c, value: c }))),
                timeout
            ]);
        } catch (err: any) {
            logger.error('Autocomplete interaction failure', { error: err.message });
        }
    },
    async execute(interaction: any) {
        const symbol = interaction.options.getString('symbol').toUpperCase();
        const price = interaction.options.getNumber('price');
        const condition = interaction.options.getString('condition') as AlertCondition;

        try {
            await interaction.deferReply();
        } catch (err) {
            // Probably already handled by another instance
            return;
        }

        try {
            await ensureUser(interaction.user.id);

            const data = await getPrice(symbol);
            if (!data) {
                return interaction.editReply(`Sorry, I couldn't find market data for **${symbol}**.`);
            }

            const repo = AppDataSource.getRepository(Alert);
            const alert = repo.create({
                userId: interaction.user.id,
                symbol: symbol,
                targetPrice: price,
                condition: condition,
                channelId: interaction.channelId
            });

            await repo.save(alert);

            let message = `Got it! I'll ping you when **${symbol}** goes **${condition}** **${formatCurrency(price)}**.`;
            message += `\n\n💰 **Current**: ${formatCurrency(data.price)}`;

            if (data.high24h && data.low24h) {
                message += `\n📊 **24h Range**: ${formatCurrency(data.low24h)} - ${formatCurrency(data.high24h)}`;
            }

            await interaction.editReply(message);
        } catch (err) {
            logger.error('Alert command execution failure', { error: err });
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('Something went wrong while setting your alert. Please try again later.');
            }
        }
    },
};
