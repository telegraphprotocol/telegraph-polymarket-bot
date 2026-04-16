# Polymarket Sniper Bot

The Polymarket Sniper Bot is an advanced trading agent designed to provide a competitive edge in prediction markets. By leveraging real-time data verification and high-frequency monitoring, the bot identifies and executes high-conviction opportunities before retail consensus reacts.

## 🚀 Overview

This agent continuously monitors specific market keywords such as **"Fuel Prices"**, **"Global Conflict"**, or **"Strait of Hormuz"** on an hourly basis. It integrates directly with Polymarket to cross-reference market trends against **Telegraph’s ground-truth subnets**.

### Key Integrations
- **DeSearch**: Real-time news and context gathering.
- **BitMind / ItsAI**: Verification of media authenticity and narrative text.
- **Telegraph Subnets**: Ground-truth data verification.

## 🛠 Features

- **Real-time Monitoring**: Hourly scans for mission-critical keywords.
- **Automated Execution**: Auto-executes positions based on verified, high-conviction data.
- **News Verification**: Cross-references Polymarket trends with verified news sources to beat the crowd.
- **Multi-Chain Support**: Operates on the **Polygon Network** using POL for gas and USDC for trading.

## 📱 Usage Example

1. **Connect Wallet**: Visit the Sniper Bot dashboard and connect your Web3 wallet.
2. **Deposit Funds**: Deposit POL (for gas) and USDC (for trading) on the Polygon chain.
3. **Enable Trading**: Toggle automated trading to allow the bot to acquire Polymarket positions on your behalf based on verified data.

## Backend Subscription Enforcement

- Subscription activation is now validated on-chain against a Polygon USDC transfer to the configured treasury wallet.
- Plans are enforced server-side with a 30-day duration and monthly trade caps:
  - `starter`: `$20`, `60` trades/month
  - `pro`: `$50`, `150` trades/month
  - `whale`: `$70`, `210` trades/month
- Bot activation endpoint enforces active subscription status and remaining trade limit before enabling.
- All subscription prices, limits, duration, and chain/token config live in one backend config module: `api/src/config/subscription.config.ts`.
- Required backend env values are documented in `api/.env.example`.

## 📦 Deliverables

- **Frontend**: A premium, intuitive dashboard for monitoring and configuration.
- **Backend**: Robust trading logic and integration services.
- **Skill**: A modular skill published on **OpenClaw Hub** and **skills.sh**, allowing other agents to utilize the sniper bot's functionality.

## 💰 Business Logic & Monetization

We implement a dual-monetization model to cater to different trader profiles:
- **Subscription Model**: $20 – $30 monthly fee for unlimited access.
- **Platform Fee Model**: A small percentage deducted from each successful trade.

## 📅 Timeline & Goals

- **Deadline**: 17th April (4-5 Days development cycle).
- **Target Audience**: High-frequency daily traders and prediction market enthusiasts.

## 📈 Why It Matters Now

Polymarket has seen record-breaking activity, with single-event markets (like the US Election) surpassing $3 billion in trading volume. In a market that reacts to news in real-time, the ability to verify and act on information faster than the crowd is a massive competitive advantage.
