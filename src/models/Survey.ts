import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";

@Entity()
export class Survey {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar")
    title!: string;

    @Column({ type: "text", nullable: true })
    description!: string;

    @Column("varchar")
    createdBy!: string; // Discord User ID

    @Column({ default: false })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => require("./SurveyQuestion").SurveyQuestion, (question: any) => question.survey, { cascade: true })
    questions!: any[];

    @OneToMany(() => require("./SurveyResponse").SurveyResponse, (response: any) => response.survey)
    responses!: any[];
}
