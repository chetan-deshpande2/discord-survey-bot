import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { AppDataSource } from '../config/database';
import { SurveyResponse } from '../models/SurveyResponse';

export const command = {
  data: new SlashCommandBuilder()
    .setName('survey-leaderboard')
    .setDescription('View the most active survey participants')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setRequired(false)
    ),
  async execute(interaction: any) {
    const limit = interaction.options.getInteger('limit') || 10;

    await interaction.deferReply({ ephemeral: false });

    const responseRepo = AppDataSource.getRepository(SurveyResponse);

    // Get all responses grouped by user
    const responses = await responseRepo
      .createQueryBuilder('response')
      .select('response.userId', 'userid')
      .addSelect('response.username', 'username')
      .addSelect('COUNT(DISTINCT response.surveyId)', 'completed')
      .addSelect('COUNT(response.id)', 'answered')
      .groupBy('response.userId')
      .addGroupBy('response.username')
      .orderBy('completed', 'DESC')
      .addOrderBy('answered', 'DESC')
      .limit(Math.min(limit, 25))
      .getRawMany();

    if (responses.length === 0) {
      return interaction.editReply(
        'No survey responses yet. Be the first to participate!'
      );
    }

    const embed = new EmbedBuilder()
      .setTitle('Survey Leaderboard')
      .setDescription('Most active survey participants')
      .setColor(0xffd700)
      .setTimestamp();

    responses.forEach((user: any, index: number) => {
      let medal = '';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';
      else medal = `${index + 1}.`;

      const surveysText = `${user.completed} survey${
        user.completed !== 1 ? 's' : ''
      }`;
      const questionsText = `${user.answered} question${
        user.answered !== 1 ? 's' : ''
      }`;

      embed.addFields({
        name: `${medal} ${user.username}`,
        value: `${surveysText} • ${questionsText}`,
        inline: false,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
