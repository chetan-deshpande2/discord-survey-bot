import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPrice, getHistory, getSparklineUrl } from '../utils/marketData';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export const command = {
  data: new SlashCommandBuilder()
    .setName('price')
    .setDescription('Get the current price of a crypto asset')
    .addStringOption((option) =>
      option
        .setName('symbol')
        .setDescription('The symbol of the asset (e.g. BTC, ETH)')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    const choices = [
      'BTC',
      'ETH',
      'USDT',
      'BNB',
      'SOL',
      'USDC',
      'XRP',
      'ADA',
      'AVAX',
      'DOGE',
      'DOT',
      'TRX',
      'MATIC',
      'LTC',
      'SHIB',
      'DAI',
      'BCH',
      'LEO',
      'UNI',
      'ATOM',
    ];
    const filtered = choices.filter((choice) =>
      choice.toLowerCase().startsWith(focusedValue.toLowerCase())
    );
    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice }))
    );
  },
  async execute(interaction: any) {
    const symbol = interaction.options.getString('symbol');

    await interaction.deferReply();

    const data = await getPrice(symbol);

    if (!data) {
      return interaction.editReply(
        `I couldn't find any price data for **${symbol}**. Are you sure the ticker is correct?`
      );
    }

    const history = await getHistory(symbol);
    const chartUrl = history.length > 0 ? getSparklineUrl(history) : null;

    const embed = new EmbedBuilder()
      .setTitle(`${data.symbol} Price`)
      .setColor(data.change24h >= 0 ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: 'Price', value: formatCurrency(data.price), inline: true },
        {
          name: '24h Change',
          value: formatPercentage(data.change24h),
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Data via CoinGate & CryptoCompare' });

    if (chartUrl) {
      embed.setImage(chartUrl);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
