import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { Alert, AlertCondition } from '../models/Alert';
import { TextChannel, EmbedBuilder } from 'discord.js';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getPrice, getHistory, getSparklineUrl } from '../utils/marketData';
import { ExtendedClient } from '../types';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('AlertService');

export const startAlertService = (client: ExtendedClient) => {
  cron.schedule('* * * * *', async () => {
    const repo = AppDataSource.getRepository(Alert);
    const alerts = await repo.find();

    if (alerts.length === 0) return;

    const symbols = [...new Set(alerts.map((a) => a.symbol))];
    logger.debug(`Running alert check for ${symbols.length} unique symbols`, {
      count: alerts.length,
    });

    for (const symbol of symbols) {
      const data = await getPrice(symbol);
      if (!data) continue;

      const symbolAlerts = alerts.filter((a) => a.symbol === symbol);

      for (const alert of symbolAlerts) {
        let triggered = false;
        if (
          alert.condition === AlertCondition.ABOVE &&
          data.price >= Number(alert.targetPrice)
        ) {
          triggered = true;
        } else if (
          alert.condition === AlertCondition.BELOW &&
          data.price <= Number(alert.targetPrice)
        ) {
          triggered = true;
        }

        if (triggered) {
          try {
            const channel = (await client.channels.fetch(
              alert.channelId
            )) as TextChannel;
            if (channel) {
              const history = await getHistory(symbol);
              const sparklineUrl = getSparklineUrl(history);
              const isPositive = data.change24h >= 0;
              const embedColor = isPositive ? 0x00ffa3 : 0xff3e00;

              const embed = new EmbedBuilder()
                .setTitle(`Price Alert: ${symbol}`)
                .setDescription(
                  `**${symbol}** has reached your target of **${formatCurrency(
                    Number(alert.targetPrice)
                  )}**.\n\nCurrent Price: **${formatCurrency(data.price)}**`
                )
                .addFields(
                  {
                    name: '24h Change',
                    value: `\`${
                      data.change24h >= 0 ? '+' : ''
                    }${formatPercentage(data.change24h)}\``,
                    inline: true,
                  },
                  {
                    name: 'Condition',
                    value: `\`Price ${alert.condition}\``,
                    inline: true,
                  }
                )
                .setColor(embedColor)
                .setTimestamp();

              if (sparklineUrl) {
                embed.setImage(sparklineUrl);
              }

              await channel.send({
                content: `<@${alert.userId}>`,
                embeds: [embed],
              });

              logger.info('Price alert triggered and sent', {
                userId: alert.userId,
                symbol,
                target: alert.targetPrice,
                actual: data.price,
              });

              // Only remove after successful send
              await repo.remove(alert);
            }
          } catch (err) {
            logger.error('Failed to process triggered alert', {
              alertId: alert.id,
              error: err,
            });
          }
        }
      }
    }
  });
};
