import {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalActionRowComponentBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';
import { SurveyResponse } from '../models/SurveyResponse';
import { getSurveyById, hasUserCompletedSurvey, getNextQuestion } from '../utils/surveyUtils';

export const command = {
    data: new SlashCommandBuilder()
        .setName('survey')
        .setDescription('Take a survey')
        .addStringOption(option =>
            option.setName('survey-name')
                .setDescription('Select a survey to take')
                .setRequired(true)
                .setAutocomplete(true)),
    async autocomplete(interaction: any) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            const surveyRepo = AppDataSource.getRepository(Survey);

            // Get active surveys only with timeout
            const surveys = await Promise.race([
                surveyRepo.find({ where: { isActive: true }, order: { id: 'ASC' } }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]).catch(() => []);

            const filtered = (surveys as any[])
                .filter(s => s.title.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(s => ({ name: s.title, value: s.title }));

            await interaction.respond(filtered.length > 0 ? filtered : [{ name: 'No active surveys', value: 'none' }]);
        } catch (error) {
            try { await interaction.respond([{ name: 'Loading...', value: 'loading' }]); } catch (e) { }
        }
    },
    async execute(interaction: any) {
        const surveyName = interaction.options.getString('survey-name');
        const userId = interaction.user.id;
        const username = interaction.user.username;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Find survey by title
        const surveyRepo = AppDataSource.getRepository(Survey);
        const survey = await surveyRepo.findOne({
            where: { title: surveyName, isActive: true },
            relations: ['questions']
        });

        if (!survey) {
            return interaction.editReply("I couldn't find that survey or it might have been deactivated.");
        }

        survey.questions.sort((a, b) => a.questionOrder - b.questionOrder);

        if (survey.questions.length === 0) {
            return interaction.editReply("This survey doesn't have any questions yet.");
        }

        const hasCompleted = await hasUserCompletedSurvey(survey.id, userId);
        if (hasCompleted) {
            return interaction.editReply("Looks like you've already finished this one. Thanks!");
        }

        const question = await getNextQuestion(survey.id, userId);

        if (!question) {
            return interaction.editReply("You've answered all the questions for this survey. Thanks!");
        }

        await showQuestion(interaction, survey, question, userId, username);
    },
};

async function showQuestion(interaction: any, survey: any, question: any, userId: string, username: string) {
    const embed = new EmbedBuilder()
        .setTitle(survey.title)
        .setDescription(survey.description || '')
        .addFields({
            name: `Question ${question.questionOrder + 1} of ${survey.questions.length}`,
            value: question.questionText
        })
        .setColor(0x5865F2);

    if (question.imageUrl) {
        embed.setImage(question.imageUrl);
    }

    let components: any[] = [];
    const mainRow = new ActionRowBuilder<any>();

    if (question.questionType === 'text') {
        embed.setFooter({ text: `${question.isRequired ? 'Required' : 'Optional'}. Answer by clicking below.` });

        const button = new ButtonBuilder()
            .setCustomId(`survey_text_${survey.id}_${question.id}`)
            .setLabel('Answer Question')
            .setStyle(ButtonStyle.Primary);

        mainRow.addComponents(button);
    } else {
        embed.setFooter({ text: `${question.isRequired ? 'Required' : 'Optional'}. Select an option below.` });

        if (question.options?.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`survey_choice_${survey.id}_${question.id}`)
                .setPlaceholder('Choose one...')
                .addOptions(
                    question.options.map((option: string, index: number) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(option)
                            .setValue(index.toString())
                    )
                );

            mainRow.addComponents(selectMenu);
        }
    }

    if (!question.isRequired) {
        const skipButton = new ButtonBuilder()
            .setCustomId(`survey_skip_${survey.id}_${question.id}`)
            .setLabel('Skip Question')
            .setStyle(ButtonStyle.Secondary);

        // If it was a select menu, we need a separate row for the skip button
        if (question.questionType === 'multiple_choice') {
            components.push(mainRow);
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(skipButton));
        } else {
            mainRow.addComponents(skipButton);
            components.push(mainRow);
        }
    } else {
        components.push(mainRow);
    }

    const response = await interaction.editReply({
        embeds: [embed],
        components
    });

    // Create collector for interactions
    const collector = response.createMessageComponentCollector({
        time: 300000 // 5 minutes
    });

    collector.on('collect', async (componentInteraction: any) => {
        if (componentInteraction.user.id !== userId) {
            await componentInteraction.reply({
                content: '❌ This is not your survey!',
                ephemeral: true
            });
            return;
        }

        if (componentInteraction.isButton()) {
            if (componentInteraction.customId.startsWith('survey_skip_')) {
                // Handle skipping optional question
                await componentInteraction.deferUpdate();

                // Save a "skipped" response (selectedOption and textResponse both null)
                await saveResponse(survey.id, question.id, userId, username, null, null);
                await showNextQuestionOrComplete(componentInteraction, survey, userId, username);
                collector.stop();
                return;
            }

            // Show modal for text input
            const modal = new ModalBuilder()
                .setCustomId(`survey_modal_${survey.id}_${question.id}`)
                .setTitle('Your Answer');

            const textInput = new TextInputBuilder()
                .setCustomId('answer_text')
                .setLabel(question.questionText.substring(0, 45)) // Discord limit
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput);
            modal.addComponents(row);

            await componentInteraction.showModal(modal);

            // Wait for modal submission
            try {
                const modalSubmit = await componentInteraction.awaitModalSubmit({
                    time: 300000,
                    filter: (i: any) => i.customId === `survey_modal_${survey.id}_${question.id}` && i.user.id === userId
                });

                await modalSubmit.deferUpdate();

                const textResponse = modalSubmit.fields.getTextInputValue('answer_text');

                // Save text response
                await saveResponse(survey.id, question.id, userId, username, null, textResponse);
                await showNextQuestionOrComplete(modalSubmit, survey, userId, username);
                collector.stop();

            } catch (error) {
                // Modal timeout handled by outer collector timeout
            }

        } else if (componentInteraction.isStringSelectMenu()) {
            // Handle multiple choice
            await componentInteraction.deferUpdate();

            const selectedOption = parseInt(componentInteraction.values[0]);

            // Save choice response
            await saveResponse(survey.id, question.id, userId, username, selectedOption, null);
            await showNextQuestionOrComplete(componentInteraction, survey, userId, username);
            collector.stop();
        }
    });

    collector.on('end', (collected: any, reason: string) => {
        if (reason === 'time') {
            interaction.editReply({
                content: '⏱️ Survey timed out. Please start again with `/survey`',
                components: [],
                embeds: []
            }).catch(() => { });
        }
    });
}

async function saveResponse(surveyId: number, questionId: number, userId: string, username: string, selectedOption: number | null, textResponse: string | null) {
    const responseRepo = AppDataSource.getRepository(SurveyResponse);
    const surveyResponse = responseRepo.create({
        surveyId,
        questionId,
        userId,
        username,
        selectedOption,
        textResponse
    });

    try {
        await responseRepo.save(surveyResponse);
    } catch (error: any) {
        if (error.code === '23505') {
            throw new Error('You have already answered this question.');
        }
        throw error;
    }
}

async function showNextQuestionOrComplete(interaction: any, survey: any, userId: string, username: string) {
    const nextQuestion = await getNextQuestion(survey.id, userId);

    if (!nextQuestion) {
        // Survey completed
        const completionEmbed = new EmbedBuilder()
            .setTitle('✅ Survey Completed!')
            .setDescription(`Thank you for completing "${survey.title}"!`)
            .setColor(0x00FF00);

        await interaction.editReply({
            embeds: [completionEmbed],
            components: []
        });
        return;
    }

    // Show next question
    await showQuestion(interaction, survey, nextQuestion, userId, username);
}
