import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';
import { SurveyResponse } from '../models/SurveyResponse';

export const command = {
  data: new SlashCommandBuilder()
    .setName('survey-trends')
    .setDescription('View response trends over time for a survey (Admin only)')
    .addStringOption((option) =>
      option
        .setName('survey-name')
        .setDescription('Select a survey to view trends')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async autocomplete(interaction: any) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const surveyRepo = AppDataSource.getRepository(Survey);

      const surveys = await Promise.race([
        surveyRepo.find({ order: { id: 'ASC' } }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 2000)
        ),
      ]).catch(() => []);

      const filtered = (surveys as any[])
        .filter((s) => s.title.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map((s) => ({
          name: `${s.title} ${s.isActive ? 'Active' : 'Inactive'}`,
          value: s.title,
        }));

      await interaction.respond(
        filtered.length > 0 ? filtered : [{ name: 'No surveys', value: 'none' }]
      );
    } catch (error) {
      try {
        await interaction.respond([{ name: 'Loading...', value: 'loading' }]);
      } catch (e) {}
    }
  },
  async execute(interaction: any) {
    const surveyName = interaction.options.getString('survey-name');

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const surveyRepo = AppDataSource.getRepository(Survey);
    const responseRepo = AppDataSource.getRepository(SurveyResponse);

    const survey = await surveyRepo.findOne({ where: { title: surveyName } });

    if (!survey) {
      await interaction.editReply('❌ Survey not found.');
      return;
    }

    // Get count of responses per day for the last 30 days
    const trends = await responseRepo
      .createQueryBuilder('response')
      .select('DATE(response.timestamp)', 'date')
      .addSelect('COUNT(DISTINCT response.userId)', 'participants')
      .addSelect('COUNT(response.id)', 'total')
      .where('response.surveyId = :surveyId', { surveyId: survey.id })
      .groupBy('DATE(response.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    if (trends.length === 0) {
      await interaction.editReply('No responses yet for this survey.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Response Trends: ${survey.title}`)
      .setDescription('Daily participation over time')
      .setColor(0x5865f2)
      .setTimestamp();

    let trendText = '```\nDate       | Users | Ans\n-----------|-------|----\n';
    trends.forEach((t) => {
      const dateStr = new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      trendText += `${dateStr.padEnd(10)} | ${t.participants
        .toString()
        .padEnd(5)} | ${t.total}\n`;
    });
    trendText += '```';

    embed.addFields({ name: 'Daily Breakdown', value: trendText });

    // Calculate some stats
    const totalUsers = await responseRepo
      .createQueryBuilder('response')
      .select('COUNT(DISTINCT response.userId)', 'count')
      .where('response.surveyId = :surveyId', { surveyId: survey.id })
      .getRawOne();

    const totalAnswers = await responseRepo.count({
      where: { surveyId: survey.id },
    });

    embed.addFields({
      name: 'Total Stats',
      value: `👥 Unique Participants: **${totalUsers.count}**\n📝 Total Answers: **${totalAnswers}**`,
      inline: true,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
