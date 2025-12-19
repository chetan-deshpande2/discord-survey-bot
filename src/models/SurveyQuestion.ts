import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Survey } from "./Survey";

@Entity()
export class SurveyQuestion {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("integer")
    surveyId!: number;

    @Column({ type: "text" })
    questionText!: string;

    @Column({ type: "varchar", default: "multiple_choice" })
    questionType!: string; // "multiple_choice" or "text"

    @Column({ type: "json", nullable: true })
    options!: string[] | null; // Array of option strings for multiple choice, null for text

    @Column("varchar", { nullable: true })
    imageUrl!: string; // Optional image URL to display with question

    @Column()
    questionOrder!: number; // Order of question in survey

    @Column({ default: true })
    isRequired!: boolean;

    @Column({ type: "json", nullable: true })
    conditionalLogic!: {
        dependsOnQuestionId: number;
        showIfOptionIndex: number;
    } | null;

    @ManyToOne(() => Survey, (survey) => survey.questions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "surveyId" })
    survey!: Survey;

    @OneToMany(() => require("./SurveyResponse").SurveyResponse, (response: any) => response.question)
    responses!: any[];
}
