import winston from 'winston';
import chalk from 'chalk';
import 'winston-daily-rotate-file';

// Moved from index.ts to break circular dependency for TypeORM CLI
export const instanceId = Math.random().toString(36).substring(7);

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

// File transport for production
const fileTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: json()
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
        }),
        ...(process.env.NODE_ENV === 'production' ? [fileTransport] : [])
    ]
});

// Helper for contextual logging
export const createChildLogger = (serviceName: string) => {
    return logger.child({ service: serviceName });
};
