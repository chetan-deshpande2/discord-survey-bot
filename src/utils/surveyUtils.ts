import { AppDataSource } from '../config/database';
import { Survey } from '../models/Survey';
import { SurveyQuestion } from '../models/SurveyQuestion';
import { SurveyResponse } from '../models/SurveyResponse';


export async function getSurveyById(id: number): Promise<Survey | null> {
    const surveyRepo = AppDataSource.getRepository(Survey);
    return await surveyRepo.findOne({
        where: { id },
        relations: ['questions'],
        order: {
            questions: {
                questionOrder: 'ASC'
            }
        }
    });
}

export async function hasUserCompletedSurvey(surveyId: number, userId: string): Promise<boolean> {
    const surveyRepo = AppDataSource.getRepository(Survey);
    const responseRepo = AppDataSource.getRepository(SurveyResponse);

    const survey = await surveyRepo.findOne({
        where: { id: surveyId },
        relations: ['questions']
    });

    if (!survey) return false;

    const userResponses = await responseRepo.count({
        where: {
            surveyId,
            userId
        }
    });

    return userResponses >= survey.questions.length;
}

export async function getNextQuestion(surveyId: number, userId: string): Promise<SurveyQuestion | null> {
    const surveyRepo = AppDataSource.getRepository(Survey);
    const responseRepo = AppDataSource.getRepository(SurveyResponse);

    const survey = await surveyRepo.findOne({
        where: { id: surveyId },
        relations: ['questions']
    });

    if (!survey) return null;

    const answeredResponses = await responseRepo.find({
        where: { surveyId, userId },
        select: ['questionId', 'selectedOption']
    });

    const answeredQuestionIds = answeredResponses.map(r => r.questionId);

    for (const question of survey.questions) {
        if (answeredQuestionIds.includes(question.id)) continue;

        if (question.conditionalLogic) {
            const dependencyResponse = answeredResponses.find(r => r.questionId === question.conditionalLogic?.dependsOnQuestionId);

            if (!dependencyResponse) continue;

            if (dependencyResponse.selectedOption !== question.conditionalLogic?.showIfOptionIndex) {
                continue;
            }
        }

        return question;
    }

    return null;
}

export async function calculateResults(surveyId: number) {
    const surveyRepo = AppDataSource.getRepository(Survey);
    const responseRepo = AppDataSource.getRepository(SurveyResponse);

    const survey = await surveyRepo.findOne({
        where: { id: surveyId },
        relations: ['questions']
    });

    if (!survey) return null;

    const responses = await responseRepo.find({
        where: { surveyId }
    });

    const uniqueUsers = new Set(responses.map(r => r.userId));

    const questionResults = await Promise.all(
        survey.questions.map(async (question) => {
            const questionResponses = responses.filter(r => r.questionId === question.id);

            if (question.questionType === 'text') {
                const textResponses = questionResponses
                    .map(r => r.textResponse)
                    .filter(r => r !== null && r !== undefined) as string[];

                return {
                    questionId: question.id,
                    questionText: question.questionText,
                    questionType: 'text',
                    totalResponses: textResponses.length,
                    textResponses,
                    optionCounts: []
                };
            } else {
                const optionCounts = (question.options || []).map((option: string, index: number) => {
                    const count = questionResponses.filter(r => r.selectedOption === index).length;
                    return {
                        option,
                        count,
                        percentage: questionResponses.length > 0
                            ? Math.round((count / questionResponses.length) * 100)
                            : 0
                    };
                });

                return {
                    questionId: question.id,
                    questionText: question.questionText,
                    questionType: 'multiple_choice',
                    totalResponses: questionResponses.length,
                    optionCounts,
                    textResponses: []
                };
            }
        })
    );

    return {
        surveyId,
        title: survey.title,
        totalParticipants: uniqueUsers.size,
        questionResults
    };
}

export function generateProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
}
