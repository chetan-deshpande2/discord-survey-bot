import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { PortfolioItem } from '../models/PortfolioItem';

const userRepository = AppDataSource.getRepository(User);
const portfolioRepository = AppDataSource.getRepository(PortfolioItem);

const DEFAULT_BALANCE = 10000;

export const ensureUser = async (userId: string): Promise<User> => {
    let user = await userRepository.findOne({
        where: { userId },
        relations: ['portfolio']
    });

    if (!user) {
        user = userRepository.create({
            userId,
            balance: DEFAULT_BALANCE,
            portfolio: []
        });
        await userRepository.save(user);
    }

    return user;
};

export const executeBuy = async (userId: string, symbol: string, quantity: number, price: number): Promise<{ success: boolean, message: string }> => {
    const user = await ensureUser(userId);
    const cost = quantity * price;

    if (user.balance < cost) {
        return { success: false, message: `Insufficient balance. You have $${user.balance}, but need $${cost}.` };
    }

    user.balance = Number(user.balance) - cost;

    let item = user.portfolio.find(p => p.symbol === symbol);

    if (item) {
        const oldQty = Number(item.quantity);
        const oldAvg = Number(item.avgPrice);

        // Recalculate average price
        const newQty = oldQty + quantity;
        const newAvg = ((oldQty * oldAvg) + (quantity * price)) / newQty;

        item.quantity = newQty;
        item.avgPrice = newAvg;
        await portfolioRepository.save(item);
    } else {
        item = portfolioRepository.create({
            user,
            userId,
            symbol,
            quantity,
            avgPrice: price
        });
        await portfolioRepository.save(item);
    }

    await userRepository.save(user);

    return { success: true, message: `Bought ${quantity} ${symbol} at $${price}` };
};

export const executeSell = async (userId: string, symbol: string, quantity: number, price: number): Promise<{ success: boolean, message: string }> => {
    const user = await ensureUser(userId);
    const portfolioItem = user.portfolio.find(p => p.symbol === symbol);

    if (!portfolioItem || Number(portfolioItem.quantity) < quantity) {
        return { success: false, message: `You do not own enough ${symbol} to sell.` };
    }

    const revenue = quantity * price;
    user.balance = Number(user.balance) + revenue;

    const newQty = Number(portfolioItem.quantity) - quantity;

    if (newQty <= 0) {
        await portfolioRepository.remove(portfolioItem);
    } else {
        portfolioItem.quantity = newQty;
        await portfolioRepository.save(portfolioItem);
    }

    await userRepository.save(user);

    return { success: true, message: `Successfully sold ${quantity} ${symbol} @ $${price}` };
};
