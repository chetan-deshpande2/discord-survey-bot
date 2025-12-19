import winston from 'winston';
import chalk from 'chalk';
import { instanceId } from '../index';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for development (pretty print)
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    const ts = chalk.gray(timestamp);
    const id = chalk.cyan(`[${instanceId}]`);
    const msg = stack || message;

    let metaStr = '';
    if (Object.keys(metadata).length > 0) {
        metaStr = `\n${chalk.gray(JSON.stringify(metadata, null, 2))}`;
    }

    return `${ts} ${id} ${level}: ${msg}${metaStr}`;
});

// Create the logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'production' ? json() : devFormat
    ),
    transports: [
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? json()
                : combine(colorize(), devFormat)
        })
    ]
});

// Helper for contextual logging
export const createChildLogger = (serviceName: string) => {
    return logger.child({ service: serviceName });
};
