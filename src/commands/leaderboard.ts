import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { getPrice } from '../utils/marketData';
import { formatCurrency } from '../utils/formatters';

export const command = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard'),
    async execute(interaction: any) {
        await interaction.deferReply();

        const userRepository = AppDataSource.getRepository(User);
        const users = await userRepository.find({ relations: ['portfolio'] });

        // This is expensive for many users, optimization would be needed for production
        // Either cache total equity in DB properly or update periodically.

        const leaderboardData = [];

        for (const user of users) {
            let totalValue = Number(user.balance);
            for (const item of user.portfolio) {
                const priceData = await getPrice(item.symbol);
                const price = priceData?.price || 0;
                totalValue += Number(item.quantity) * price;
            }
            leaderboardData.push({ userId: user.userId, totalValue });
        }

        leaderboardData.sort((a, b) => b.totalValue - a.totalValue);
        const top10 = leaderboardData.slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🏆 Leaderboard')
            .setColor(0xFFD700);

        let description = '';
        for (const [index, entry] of top10.entries()) {
            // Fetch username via Discord API
            // Note: In large servers cache checking is better
            let username = 'Unknown User';
            try {
                const discordUser = await interaction.client.users.fetch(entry.userId);
                username = discordUser.username;
            } catch (e) { }

            description += `${index + 1}. **${username}** - ${formatCurrency(entry.totalValue)}\n`;
        }

        embed.setDescription(description || 'No users found.');

        await interaction.editReply({ embeds: [embed] });
    },
};
