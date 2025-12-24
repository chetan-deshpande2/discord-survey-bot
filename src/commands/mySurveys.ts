import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';
import { SurveyResponse } from '../models/SurveyResponse';

export const command = {
  data: new SlashCommandBuilder()
    .setName('my-surveys')
    .setDescription('View your survey completion status'),
  async execute(interaction: any) {
    const userId = interaction.user.id;

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const surveyRepo = AppDataSource.getRepository(Survey);
    const responseRepo = AppDataSource.getRepository(SurveyResponse);

    // Get all active surveys
    const activeSurveys = await surveyRepo.find({
      where: { isActive: true },
      relations: ['questions'],
      order: { id: 'ASC' },
    });

    if (activeSurveys.length === 0) {
      await interaction.editReply('No active surveys available at the moment.');
      return;
    }

    // Get user's responses for all surveys
    const userResponses = await responseRepo.find({
      where: { userId },
    });

    const embed = new EmbedBuilder()
      .setTitle(`My Surveys`)
      .setDescription(`Viewing survey status for ${interaction.user.username}`)
      .setColor(0x5865f2)
      .setTimestamp();

    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;

    for (const survey of activeSurveys) {
      const totalQuestions = survey.questions.length;
      const surveyResponses = userResponses.filter(
        (r) => r.surveyId === survey.id
      );
      const answeredQuestions = surveyResponses.length;
      const percentage =
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0;

      let status = '';
      let emoji = '';

      if (percentage === 100) {
        status = 'Completed';
        emoji = '';
        completedCount++;
      } else if (percentage > 0) {
        status = `${percentage}% (${answeredQuestions}/${totalQuestions})`;
        emoji = '';
        inProgressCount++;
      } else {
        status = 'Not Started';
        emoji = '';
        notStartedCount++;
      }

      embed.addFields({
        name: `${survey.title}`,
        value: status,
        inline: false,
      });
    }

    // Add summary
    const summary = [
      `Completed: ${completedCount}`,
      `In Progress: ${inProgressCount}`,
      `Not Started: ${notStartedCount}`,
    ].join(' • ');

    embed.setFooter({ text: summary });

    await interaction.editReply({ embeds: [embed] });
  },
};
