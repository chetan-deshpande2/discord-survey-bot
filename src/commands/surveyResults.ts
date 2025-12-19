import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';
import { SurveyResponse } from '../models/SurveyResponse';
import { calculateResults, generateProgressBar } from '../utils/surveyUtils';

export const command = {
    data: new SlashCommandBuilder()
        .setName('survey-results')
        .setDescription('View survey results (Admin only)')
        .addStringOption(option =>
            option.setName('survey-name')
                .setDescription('Select a survey to view results')
                .setRequired(true)
                .setAutocomplete(true))
        .addBooleanOption(option =>
            option.setName('export')
                .setDescription('Export detailed results as CSV')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('user-id')
                .setDescription('Check completion for specific user (Discord ID)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction: any) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            const surveyRepo = AppDataSource.getRepository(Survey);

            // Get all surveys with timeout protection
            const surveys = await Promise.race([
                surveyRepo.find({ order: { id: 'ASC' } }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 2000)
                )
            ]).catch(() => []);

            const filtered = (surveys as any[])
                .filter((s: any) => s.title.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map((s: any) => ({
                    name: `${s.title} ${s.isActive ? '🟢 Active' : '⚫ Inactive'}`,
                    value: s.title
                }));

            await interaction.respond(filtered.length > 0 ? filtered : [
                { name: 'No surveys found', value: 'none' }
            ]);
        } catch (error) {
            // If autocomplete fails, provide empty response
            try {
                await interaction.respond([{ name: 'Loading...', value: 'loading' }]);
            } catch (e) {
                // Interaction already expired, ignore
            }
        }
    },
    async execute(interaction: any) {
        const surveyName = interaction.options.getString('survey-name');
        const shouldExport = interaction.options.getBoolean('export') || false;
        const specificUserId = interaction.options.getString('user-id');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Find survey by name
        const surveyRepo = AppDataSource.getRepository(Survey);
        const survey = await surveyRepo.findOne({
            where: { title: surveyName },
            relations: ['questions']
        });

        if (!survey) {
            return interaction.editReply(`I couldn't find the survey "${surveyName}".`);
        }

        // Check specific user completion if requested
        if (specificUserId) {
            const responseRepo = AppDataSource.getRepository(SurveyResponse);
            const userResponses = await responseRepo.find({
                where: { surveyId: survey.id, userId: specificUserId }
            });

            const total = survey.questions.length;
            const answered = userResponses.length;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

            const embed = new EmbedBuilder()
                .setTitle(`Completion Status: ${surveyName}`)
                .setDescription(`Checking progress for User ID: ${specificUserId}`)
                .addFields(
                    { name: 'Progress', value: `${answered} / ${total} questions answered`, inline: true },
                    { name: 'Completion', value: `${generateProgressBar(pct, 20)}\n${pct}% Complete`, inline: false }
                )
                .setColor(pct === 100 ? 0x00FF00 : 0xFFA500)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        const results = await calculateResults(survey.id);

        if (!results) {
            return interaction.editReply("I couldn't calculate the results for that survey.");
        }

        const embed = new EmbedBuilder()
            .setTitle(`Results: ${results.title}`)
            .setDescription(`Total Participants: **${results.totalParticipants}**`)
            .setColor(0x5865F2)
            .setTimestamp();

        results.questionResults.forEach((qr: any, idx: number) => {
            if (qr.questionType === 'text') {
                const samples = qr.textResponses.slice(0, 5);
                const text = samples.length > 0
                    ? samples.map((r: any) => `• "${r.substring(0, 100)}${r.length > 100 ? '...' : ''}"`).join('\n')
                    : 'No responses';

                const more = qr.totalResponses > 5 ? `\n_...and ${qr.totalResponses - 5} more_` : '';

                embed.addFields({
                    name: `Q${idx + 1}: ${qr.questionText}`,
                    value: `**${qr.totalResponses} answered**\n${text}${more}`,
                    inline: false
                });
            } else {
                const bars = qr.optionCounts
                    .map((oc: any) => `${oc.option}: ${generateProgressBar(oc.percentage, 15)} (${oc.count})`)
                    .join('\n');

                embed.addFields({
                    name: `Q${idx + 1}: ${qr.questionText}`,
                    value: bars || 'No responses',
                    inline: false
                });
            }
        });

        const refreshButton = new ButtonBuilder()
            .setCustomId(`refresh_results_${survey.id}`)
            .setLabel('🔄 Refresh Dashboard')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshButton);

        const replyOptions: any = { embeds: [embed], components: [row] };
        if (shouldExport) {
            let csv = '';
            let fileName = '';

            if (specificUserId) {
                // Export specific user's detailed responses
                const responseRepo = AppDataSource.getRepository(SurveyResponse);
                const userResponses = await responseRepo.find({
                    where: { surveyId: survey.id, userId: specificUserId },
                    relations: ['question']
                });

                if (userResponses.length > 0) {
                    csv = 'Question,Question Type,Response,Timestamp,Last Updated\n';
                    userResponses.sort((a, b) => a.question.questionOrder - b.question.questionOrder).forEach(r => {
                        const answer = r.textResponse || survey.questions.find(q => q.id === r.questionId)?.options?.[r.selectedOption || 0] || 'N/A';
                        csv += `"${r.question.questionText.replace(/"/g, '""')}","${r.question.questionType}","${answer.replace(/"/g, '""')}","${r.timestamp.toISOString()}","${r.updatedAt.toISOString()}"\n`;
                    });
                    fileName = `survey_${survey.id}_user_${specificUserId}_results.csv`;
                }
            } else {
                // Global results export
                csv = 'Question,Question Type,Response,Count,Percentage\n';
                results.questionResults.forEach((qr: any) => {
                    if (qr.questionType === 'text') {
                        qr.textResponses.forEach((response: any) => {
                            csv += `"${qr.questionText.replace(/"/g, '""')}","text","${response.replace(/"/g, '""')}",1,N/A\n`;
                        });
                    } else {
                        qr.optionCounts.forEach((oc: any) => {
                            csv += `"${qr.questionText.replace(/"/g, '""')}","multiple_choice","${oc.option.replace(/"/g, '""')}",${oc.count},${oc.percentage}%\n`;
                        });
                    }
                });
                fileName = `survey_${survey.id}_results.csv`;
            }

            if (csv) {
                const buffer = Buffer.from(csv, 'utf-8');
                const attachment = new AttachmentBuilder(buffer, { name: fileName });
                replyOptions.files = [attachment];
            }
        }

        const msg = await interaction.editReply(replyOptions);

        // Add refresh collector
        const collector = msg.createMessageComponentCollector({ time: 600000 }); // 10 minutes

        collector.on('collect', async (i: any) => {
            if (i.customId === `refresh_results_${survey.id}`) {
                await i.deferUpdate();

                const updatedResults = await calculateResults(survey.id);
                if (!updatedResults) return;

                const refreshEmbed = new EmbedBuilder(embed.data);
                refreshEmbed.setFields([]); // Clear old fields
                refreshEmbed.setDescription(`Total Participants: **${updatedResults.totalParticipants}**\n*(Last Updated: ${new Date().toLocaleTimeString()})*`);

                updatedResults.questionResults.forEach((qr: any, idx: number) => {
                    if (qr.questionType === 'text') {
                        const sample = qr.textResponses.slice(0, 5).map((r: any) => `• "${r.substring(0, 100)}${r.length > 100 ? '...' : ''}"`).join('\n') || 'No responses';
                        refreshEmbed.addFields({ name: `📝 Q${idx + 1}: ${qr.questionText}`, value: `**${qr.totalResponses} responses**\n${sample}` });
                    } else {
                        const bars = qr.optionCounts.map((oc: any) => `${oc.option}: ${generateProgressBar(oc.percentage, 15)} (${oc.count})`).join('\n') || 'No responses';
                        refreshEmbed.addFields({ name: `Q${idx + 1}: ${qr.questionText}`, value: bars });
                    }
                });

                await i.editReply({ embeds: [refreshEmbed] });
            }
        });
    },
};
