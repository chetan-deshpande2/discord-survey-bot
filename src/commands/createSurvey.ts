import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    ModalActionRowComponentBuilder,
    MessageFlags
} from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';
import { SurveyQuestion } from '../models/SurveyQuestion';

export const command = {
    data: new SlashCommandBuilder()
        .setName('create-survey')
        .setDescription('Create a new survey (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction: any) {
        const modal = new ModalBuilder()
            .setCustomId('create_survey_modal')
            .setTitle('Create New Survey');

        const titleInput = new TextInputBuilder()
            .setCustomId('survey_title')
            .setLabel('Survey Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const descInput = new TextInputBuilder()
            .setCustomId('survey_description')
            .setLabel('Description (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500);

        const questionsInput = new TextInputBuilder()
            .setCustomId('survey_questions')
            .setLabel('Questions (one per line)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('What is your favorite color?\nHow often do you trade?\nWhat is your experience level?')
            .setRequired(true)
            .setMaxLength(2000);

        const optionsInput = new TextInputBuilder()
            .setCustomId('survey_options')
            .setLabel('Options for each question (| separator)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Red,Blue,Green\nDaily,Weekly,Monthly,Rarely\nBeginner,Intermediate,Advanced,Expert')
            .setRequired(true)
            .setMaxLength(2000);

        const row1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(titleInput);
        const row2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(descInput);
        const row3 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(questionsInput);
        const row4 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(optionsInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    },
};

// Handle modal submission
export async function handleCreateSurveyModal(interaction: any) {
    if (!interaction.isModalSubmit() || interaction.customId !== 'create_survey_modal') {
        return false;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const title = interaction.fields.getTextInputValue('survey_title');
    const description = interaction.fields.getTextInputValue('survey_description') || null;
    const questionsText = interaction.fields.getTextInputValue('survey_questions');
    const optionsText = interaction.fields.getTextInputValue('survey_options');

    const questionLines = questionsText.split('\n').map((q: string) => q.trim()).filter((q: string) => q.length > 0);
    const optionLines = optionsText.split('\n').map((o: string) => o.trim()).filter((o: string) => o.length > 0);

    if (questionLines.length !== optionLines.length) {
        return interaction.editReply("The number of questions doesn't match the number of option sets. Please check your formatting.");
    }

    if (questionLines.length === 0) {
        return interaction.editReply("You need to provide at least one question.");
    }

    const surveyRepo = AppDataSource.getRepository(Survey);
    const questionRepo = AppDataSource.getRepository(SurveyQuestion);

    try {
        const survey = surveyRepo.create({
            title,
            description,
            createdBy: interaction.user.id,
            isActive: false
        });

        await surveyRepo.save(survey);

        const questions = questionLines.map((text: string, index: number) => {
            const options = optionLines[index].split(',').map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0);

            if (options.length < 2) {
                throw new Error(`Question ${index + 1} needs at least 2 options.`);
            }

            return questionRepo.create({
                surveyId: survey.id,
                questionText: text,
                options,
                questionOrder: index
            });
        });

        await questionRepo.save(questions);

        await interaction.editReply(
            `Survey **${title}** created (ID: ${survey.id}).\n` +
            `It has ${questionLines.length} questions and is currently **Inactive**.\n` +
            `Use \`/activate-survey\` when you're ready to go live.`
        );
    } catch (err: any) {
        console.error('Survey creation failed:', err);
        await interaction.editReply(`Failed to create survey: ${err.message}`);
    }

    return true;
}
