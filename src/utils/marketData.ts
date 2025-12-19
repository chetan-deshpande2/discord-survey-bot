import axios from 'axios';

export interface MarketData {
    symbol: string;
    price: number;
    change24h: number; // Percentage
    high24h?: number;
    low24h?: number;
    type: 'CRYPTO' | 'STOCK';
}

const COINGATE_API_URL = process.env.COINGATE_API_URL || 'https://api.coingate.com/v2';

// Cache to prevent hitting rate limits
const cache: Map<string, { data: MarketData, timestamp: number }> = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute

export const getCryptoPrice = async (symbol: string): Promise<MarketData | null> => {
    symbol = symbol.toUpperCase();

    // Check cache
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        // CoinGate API: GET /rates/merchant/{from}/{to}
        const headers: any = {};
        if (process.env.COINGATE_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.COINGATE_API_KEY}`;
        }

        const response = await axios.get(`${COINGATE_API_URL}/rates/merchant/${symbol}/USD`, { headers });
        const price = Number(response.data);

        if (isNaN(price)) return null;

        let change24h = 0;
        let high24h: number | undefined;
        let low24h: number | undefined;

        try {
            // Supplement with 24h metrics from CryptoCompare
            const ccUrl = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol}&tsyms=USD`;
            const ccResponse = await axios.get(ccUrl);
            const raw = ccResponse.data?.RAW?.[symbol]?.USD;
            if (raw) {
                change24h = raw.CHANGEPCT24HOUR || 0;
                high24h = raw.HIGH24HOUR;
                low24h = raw.LOW24HOUR;
            }
        } catch (ccError) {
            console.error(`[DEBUG] Error fetching 24h metrics for ${symbol}:`, ccError);
        }

        const marketData: MarketData = {
            symbol: symbol,
            price: price,
            change24h: change24h,
            high24h: high24h,
            low24h: low24h,
            type: 'CRYPTO'
        };

        cache.set(symbol, { data: marketData, timestamp: Date.now() });
        return marketData;
    } catch (error) {
        console.error(`Error fetching crypto price for ${symbol}:`, error);
        return null;
    }
};

// Placeholder for Stocks (Yahoo Finance usually requires scraping or complex APIs)
// We'll stub it for now or use a public free API if available.
export const getStockPrice = async (symbol: string): Promise<MarketData | null> => {
    // TODO: Implement Yahoo Finance scraping or API
    return null;
};

export const getPrice = async (symbol: string): Promise<MarketData | null> => {
    // Try crypto first, then stock (or determine based on input)
    // For now, defaulting to basic crypto lookup
    return await getCryptoPrice(symbol);
}

export const getHistory = async (symbol: string): Promise<number[]> => {
    try {
        // CryptoCompare: 7 days of history
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=7`;
        const response = await axios.get(url);
        if (response.data.Response === 'Success') {
            return response.data.Data.Data.map((d: any) => d.close);
        }
        return [];
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
};

export const getSparklineUrl = (prices: number[], color: string = 'rgb(75, 192, 192)'): string => {
    const chartConfig = {
        type: 'sparkline',
        data: {
            labels: prices.map((_, i) => i), // Dummy labels
            datasets: [{
                data: prices,
                fill: true,
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
                pointRadius: 0,
            }]
        }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};
