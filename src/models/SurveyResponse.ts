import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Unique } from "typeorm";
import { Survey } from "./Survey";
import { SurveyQuestion } from "./SurveyQuestion";

@Entity()
@Unique(["surveyId", "questionId", "userId"]) // Prevent duplicate responses
export class SurveyResponse {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("integer")
    surveyId!: number;

    @Column("integer")
    questionId!: number;

    @Column("varchar")
    userId!: string; // Discord User ID

    @Column("varchar")
    username!: string; // Discord username for easier reporting

    @Column({ type: "integer", nullable: true })
    selectedOption!: number | null; // Index of selected option (for multiple choice)

    @Column({ type: "text", nullable: true })
    textResponse!: string | null; // Free-text response (for text questions)

    @CreateDateColumn()
    timestamp!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Survey, (survey) => survey.responses, { onDelete: "CASCADE" })
    @JoinColumn({ name: "surveyId" })
    survey!: Survey;

    @ManyToOne(() => SurveyQuestion, (question) => question.responses, { onDelete: "CASCADE" })
    @JoinColumn({ name: "questionId" })
    question!: SurveyQuestion;

    // Note: No foreign key to User table - surveys work independently from trading features
}
