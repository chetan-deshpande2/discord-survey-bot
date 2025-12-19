import { SlashCommandBuilder } from 'discord.js';
import { getPrice } from '../utils/marketData';
import { executeBuy } from '../services/userService';
import { formatCurrency } from '../utils/formatters';

export const command = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy a crypto asset')
        .addStringOption(option =>
            option.setName('symbol')
                .setDescription('The symbol of the asset (e.g. BTC)')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount to buy')
                .setRequired(true)),
    async execute(interaction: any) {
        const symbol = interaction.options.getString('symbol').toUpperCase();
        const amount = interaction.options.getNumber('amount');

        if (amount <= 0) {
            await interaction.reply({ content: 'Amount must be greater than 0.', ephemeral: true });
            return;
        }

        await interaction.deferReply();

        const data = await getPrice(symbol);

        if (!data) {
            return interaction.editReply(`I couldn't get a price for **${symbol}** right now. Is that the right ticker?`);
        }

        const result = await executeBuy(interaction.user.id, data.symbol, amount, data.price);

        if (result.success) {
            await interaction.editReply(`${result.message}\nTotal: ${formatCurrency(amount * data.price)}`);
        } else {
            await interaction.editReply(result.message);
        }
    },
};
