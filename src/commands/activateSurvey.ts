import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';

export const command = {
    data: new SlashCommandBuilder()
        .setName('activate-survey')
        .setDescription('Activate or deactivate a survey (Admin only)')
        .addStringOption(option =>
            option.setName('survey-name')
                .setDescription('Select a survey to activate/deactivate')
                .setRequired(true)
                .setAutocomplete(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction: any) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            const surveyRepo = AppDataSource.getRepository(Survey);

            const surveys = await Promise.race([
                surveyRepo.find({ order: { id: 'ASC' } }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]).catch(() => []);

            const filtered = (surveys as any[])
                .filter(s => s.title.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(s => ({ name: `${s.title} ${s.isActive ? '🟢 Active' : '⚫ Inactive'}`, value: s.title }));

            await interaction.respond(filtered.length > 0 ? filtered : [{ name: 'No surveys', value: 'none' }]);
        } catch (error) {
            try { await interaction.respond([{ name: 'Loading...', value: 'loading' }]); } catch (e) { }
        }
    },
    async execute(interaction: any) {
        const surveyName = interaction.options.getString('survey-name');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const surveyRepo = AppDataSource.getRepository(Survey);
        const survey = await surveyRepo.findOne({ where: { title: surveyName } });

        if (!survey) {
            await interaction.editReply(`❌ Survey "${surveyName}" not found.`);
            return;
        }

        survey.isActive = !survey.isActive;
        await surveyRepo.save(survey);

        const status = survey.isActive ? '🟢 activated' : '⚫ deactivated';
        await interaction.editReply(`✅ Survey "${survey.title}" has been ${status}.`);
    },
};
