# Discord Survey & Trading Bot

A production-ready Discord bot built with **TypeScript**, **Node.js 20**, and **TypeORM**. It features a robust survey engine with conditional logic and localized crypto trading simulations.

## 🚀 Features
- **Smart Surveys**: Conditional questions, optional skipping, and real-time refreshable dashboards.
- **Admin Tools**: Create surveys via modals, export results to CSV, and track participation trends.
- **Trading Engine**: Real-time pricing via CoinGate, portfolio tracking, and price alerts.
- **Unkillable Core**: Global error handlers, PID-based instance locking, and Docker-ready.

---

## 🛠️ Getting Started

### 1. Discord Portal Setup
1. Create an app at the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **Bot**:
   - Grab your `DISCORD_TOKEN`.
   - Enable **Server Members** and **Message Content** intents.
3. Under **OAuth2 -> URL Generator**:
   - Scopes: `bot`, `applications.commands`.
   - Permissions: `Send Messages`, `Embed Links`, `Attach Files`, and `Use External Emojis`.
4. Invite the bot using the generated link.

### 2. Local Setup
```bash
git clone https://github.com/chetan-deshpande2/discord-survey-bot.git
cd discord-survey-bot
npm install
cp .env.example .env # Fill in your DB and Discord creds
```

### 3. Run
- **Dev**: `npm run dev`
- **Docker**: `docker-compose up -d`
- **Prod**: `npm run build && npm start`

---

## 📜 Commands
- `/survey`: Take an active survey.
- `/my-surveys`: View your completion progress.
- `/price`: Current market data.
- `/buy` / `/sell`: Simulated trading.
- `/alert`: Set price notifications.
- `/survey-results` (Admin): Stats & CSV export.
- `/survey-trends` (Admin): Daily participation table
