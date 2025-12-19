import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { PortfolioItem } from '../models/PortfolioItem';
import { Alert } from '../models/Alert';
import { Survey } from '../models/Survey';
import { SurveyQuestion } from '../models/SurveyQuestion';
import { SurveyResponse } from '../models/SurveyResponse';

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "discord_trading_bot",
    synchronize: true, // Auto-create tables (dev only)
    logging: false,
    entities: [User, PortfolioItem, Alert, Survey, SurveyQuestion, SurveyResponse],
    subscribers: [],
    migrations: [],
});

export const connectDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log("DB connection established");
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
};
