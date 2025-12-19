# 🤖 Advanced Discord Survey & Trading Bot

A high-performance, "unkillable" Discord bot built with **TypeScript**, **Node.js 20**, and **TypeORM**. Features a complex survey system with conditional logic and a simulated crypto trading engine.

---

## 🚀 Key Features

### 📊 Advanced Survey System
- **Smart Logic**: Conditional branching (questions show/hide based on answers).
- **Flexibility**: Multiple-choice, text responses, and optional "skip" support.
- **Admin Suite**: Create surveys via modals, manage status, and view real-time trends.
- **Analytics**: Beautiful dashboard results, CSV exports, and daily participation trends.
- **Engagement**: User completion progress (`/my-surveys`) and participation leaderboards.

### 💰 Crypto Trading Simulator
- **Live Markets**: Real-time prices via CoinGate & CryptoCompare.
- **Trading**: Seamless buy/sell logic with portfolio tracking and profit metrics.
- **Smart Alerts**: Price targets with autocomplete search and 24h market range context.

### 🛡️ Production-Grade Stability
- **Crash Recovery**: Global error handlers for process-level resilience.
- **Instance Locking**: PID-based safety to prevent multiple bot instances from colliding.
- **Deployment Ready**: Fully Dockerized with Docker Compose and PM2 support.

---

## ⚙️ Discord Developer Portal Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and give your bot a name.
3. Navigate to the **Bot** tab on the left.
4. Click **Reset Token** (or **Copy Token**) to get your `DISCORD_TOKEN`. 
5. Scroll down to the **Privileged Gateway Intents** section and enable:
   - **Server Members Intent** (Required for tracking completion)
   - **Message Content Intent** (Required for reading commands/responses)
6. Navigate to **OAuth2** -> **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions (Strictly Required):
     - `Send Messages`
     - `Embed Links`
     - `Attach Files` (Required for survey CSV exports)
     - `Use External Emojis`
7. Copy the generated URL and paste it into your browser to invite the bot to your server.

---

## 🛠️ Quick Setup

### 1. Prerequisites
- **Node.js** v20+
- **PostgreSQL** 15+
- **Discord Developer Portal**: A registered Bot and Application.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/chetan-deshpande2/discord-survey-bot.git
cd discord-survey-bot

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your bot token from Discord Portal |
| `CLIENT_ID` | Your Application ID |
| `GUILD_ID` | The ID of your test/main server |
| `DB_*` | PostgreSQL connection details |
| `COINGATE_API_KEY` | (Optional) For high-rate market data |

### 4. Running the Bot
**Local Development:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

**Docker (Recommended):**
```bash
docker-compose up -d
```

---

## 📜 Commands Overview
- `/survey`: Start an active survey.
- `/my-surveys`: Check your completion status.
- `/price`: Get live crypto data and charts.
- `/buy` / `/sell`: Execute simulated trades.
- `/alert`: Set price notifications.
- `/survey-results` (Admin): View analytics and export CSV.
- `/survey-trends` (Admin): View participation over time.

---

## 🏗️ Architecture
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL with TypeORM (Data Mapper pattern)
- **UI**: Discord.js v14 (Modals, Select Menus, Buttons)
- **Container**: Multi-stage Docker optimization

---

## 🤝 Contributing
Feel free to fork and submit PRs. Ensure all code remains "human-polished"—highly readable and concisely documented. 💎
