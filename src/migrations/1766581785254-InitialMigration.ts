import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1766581785254 implements MigrationInterface {
    name = 'InitialMigration1766581785254'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "portfolio_item" ("id" SERIAL NOT NULL, "userId" character varying NOT NULL, "symbol" character varying NOT NULL, "quantity" numeric(15,6) NOT NULL, "avgPrice" numeric(15,2) NOT NULL, CONSTRAINT "PK_b880e6da04bde98e3f87796b102" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."alert_condition_enum" AS ENUM('ABOVE', 'BELOW')`);
        await queryRunner.query(`CREATE TABLE "alert" ("id" SERIAL NOT NULL, "userId" character varying NOT NULL, "symbol" character varying NOT NULL, "targetPrice" numeric(15,2) NOT NULL, "condition" "public"."alert_condition_enum" NOT NULL, "channelId" character varying NOT NULL, CONSTRAINT "PK_ad91cad659a3536465d564a4b2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("userId" character varying NOT NULL, "balance" numeric(15,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_d72ea127f30e21753c9e229891e" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "survey" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text, "createdBy" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f0da32b9181e9c02ecf0be11ed3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "survey_question" ("id" SERIAL NOT NULL, "surveyId" integer NOT NULL, "questionText" text NOT NULL, "questionType" character varying NOT NULL DEFAULT 'multiple_choice', "options" json, "imageUrl" character varying, "questionOrder" integer NOT NULL, "isRequired" boolean NOT NULL DEFAULT true, "conditionalLogic" json, CONSTRAINT "PK_ec6d65e83fd7217202178b79907" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "survey_response" ("id" SERIAL NOT NULL, "surveyId" integer NOT NULL, "questionId" integer NOT NULL, "userId" character varying NOT NULL, "username" character varying NOT NULL, "selectedOption" integer, "textResponse" text, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b197ed189748c1b680fc0e2b218" UNIQUE ("surveyId", "questionId", "userId"), CONSTRAINT "PK_d9326eb52bf8b23d56a39ce419a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "portfolio_item" ADD CONSTRAINT "FK_7b96eb457d00d091f15d37f63eb" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alert" ADD CONSTRAINT "FK_c47ec76d2c5097d80eaae03853d" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "survey_question" ADD CONSTRAINT "FK_036a359b4a0884d113f6232e96d" FOREIGN KEY ("surveyId") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "survey_response" ADD CONSTRAINT "FK_325dc8ed7bbdea328af1670dc0a" FOREIGN KEY ("surveyId") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "survey_response" ADD CONSTRAINT "FK_338f0563fe2221eadcd0e634b13" FOREIGN KEY ("questionId") REFERENCES "survey_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "survey_response" DROP CONSTRAINT "FK_338f0563fe2221eadcd0e634b13"`);
        await queryRunner.query(`ALTER TABLE "survey_response" DROP CONSTRAINT "FK_325dc8ed7bbdea328af1670dc0a"`);
        await queryRunner.query(`ALTER TABLE "survey_question" DROP CONSTRAINT "FK_036a359b4a0884d113f6232e96d"`);
        await queryRunner.query(`ALTER TABLE "alert" DROP CONSTRAINT "FK_c47ec76d2c5097d80eaae03853d"`);
        await queryRunner.query(`ALTER TABLE "portfolio_item" DROP CONSTRAINT "FK_7b96eb457d00d091f15d37f63eb"`);
        await queryRunner.query(`DROP TABLE "survey_response"`);
        await queryRunner.query(`DROP TABLE "survey_question"`);
        await queryRunner.query(`DROP TABLE "survey"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "alert"`);
        await queryRunner.query(`DROP TYPE "public"."alert_condition_enum"`);
        await queryRunner.query(`DROP TABLE "portfolio_item"`);
    }

}
