import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';

export const command = {
  data: new SlashCommandBuilder()
    .setName('list-surveys')
    .setDescription('List all available surveys'),
  async execute(interaction: any) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const surveyRepo = AppDataSource.getRepository(Survey);
    const surveys = await surveyRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (surveys.length === 0) {
      await interaction.editReply('No surveys available yet.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Available Surveys')
      .setColor(0x5865f2)
      .setDescription('Here are all the surveys:')
      .setTimestamp();

    surveys.forEach((survey) => {
      const status = survey.isActive ? 'Active' : 'Inactive';
      embed.addFields({
        name: `${survey.title} (ID: ${survey.id})`,
        value: `${status}\n${
          survey.description || 'No description'
        }\nCreated: <t:${Math.floor(survey.createdAt.getTime() / 1000)}:R>`,
        inline: false,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
