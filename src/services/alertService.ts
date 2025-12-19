import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { Alert, AlertCondition } from '../models/Alert';
import { getPrice } from '../utils/marketData';
import { ExtendedClient } from '../types';
import { TextChannel } from 'discord.js';
import { formatCurrency } from '../utils/formatters';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('AlertService');

export const startAlertService = (client: ExtendedClient) => {
    cron.schedule('* * * * *', async () => {
        const repo = AppDataSource.getRepository(Alert);
        const alerts = await repo.find();

        if (alerts.length === 0) return;

        const symbols = [...new Set(alerts.map(a => a.symbol))];
        logger.debug(`Running alert check for ${symbols.length} unique symbols`, { count: alerts.length });

        for (const symbol of symbols) {
            const data = await getPrice(symbol);
            if (!data) continue;

            const symbolAlerts = alerts.filter(a => a.symbol === symbol);

            for (const alert of symbolAlerts) {
                let triggered = false;
                if (alert.condition === AlertCondition.ABOVE && data.price >= Number(alert.targetPrice)) {
                    triggered = true;
                } else if (alert.condition === AlertCondition.BELOW && data.price <= Number(alert.targetPrice)) {
                    triggered = true;
                }

                if (triggered) {
                    try {
                        const channel = await client.channels.fetch(alert.channelId) as TextChannel;
                        if (channel) {
                            await channel.send(`🚨 **PRICE ALERT**: **${symbol}** has reached **${formatCurrency(data.price)}** (Target: ${alert.condition} ${formatCurrency(Number(alert.targetPrice))}) <@${alert.userId}>`);
                        }

                        logger.info('Price alert triggered', {
                            userId: alert.userId,
                            symbol,
                            target: alert.targetPrice,
                            actual: data.price
                        });

                        await repo.remove(alert);
                    } catch (err) {
                        logger.error('Failed to process triggered alert', { alertId: alert.id, error: err });
                    }
                }
            }
        }
    });
};
