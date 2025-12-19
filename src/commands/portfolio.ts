import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureUser } from '../services/userService';
import { getPrice } from '../utils/marketData';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export const command = {
    data: new SlashCommandBuilder()
        .setName('portfolio')
        .setDescription('View your portfolio'),
    async execute(interaction: any) {
        await interaction.deferReply();

        const user = await ensureUser(interaction.user.id);
        const portfolio = user.portfolio;

        let totalValue = Number(user.balance);
        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Portfolio`)
            .setColor(0x0099FF);

        let portfolioDescription = '';

        if (portfolio.length === 0) {
            portfolioDescription = "Your portfolio is currently empty. Use `/buy` to start trading!";
        } else {
            for (const item of portfolio) {
                const data = await getPrice(item.symbol);
                const currentPrice = data?.price || 0;
                const value = Number(item.quantity) * currentPrice;
                totalValue += value;

                const avg = Number(item.avgPrice);
                const profit = (currentPrice - avg) * Number(item.quantity);
                const profitPct = (currentPrice - avg) / avg * 100;

                portfolioDescription += `**${item.symbol}** (${Number(item.quantity).toFixed(2)})\n`;
                portfolioDescription += `Value: ${formatCurrency(value)} | P/L: ${formatCurrency(profit)} (${profitPct.toFixed(2)}%)\n\n`;
            }
        }

        embed.setDescription(`**Cash:** ${formatCurrency(Number(user.balance))}\n**Net Worth:** ${formatCurrency(totalValue)}\n\n${portfolioDescription}`);

        await interaction.editReply({ embeds: [embed] });
    },
};
