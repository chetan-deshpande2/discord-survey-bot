import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { PortfolioItem } from '../models/PortfolioItem';
import { Alert } from '../models/Alert';
import { Survey } from '../models/Survey';
import { SurveyQuestion } from '../models/SurveyQuestion';
import { SurveyResponse } from '../models/SurveyResponse';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('Database');

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "discord_trading_bot",
    synchronize: process.env.NODE_ENV !== 'production', // Auto-create tables (dev only)
    logging: false,
    entities: [User, PortfolioItem, Alert, Survey, SurveyQuestion, SurveyResponse],
    subscribers: [],
    migrations: [],
});

export const connectDatabase = async () => {
    try {
        await AppDataSource.initialize();
        logger.info('Database connection established');
    } catch (err) {
        logger.error('Database connection failed', { error: err });
        process.exit(1);
    }
};
