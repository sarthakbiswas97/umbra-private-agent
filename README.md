# Umbra Private Agent -- Confidential AI Portfolio Manager

An autonomous AI trading agent that uses [Umbra SDK](https://sdk.umbraprivacy.com) to execute trades with on-chain privacy on Solana. Trade amounts are hidden via confidential transfers, portfolio balances are encrypted, and viewing keys enable selective disclosure for compliance and investor auditing.

## The Problem

When an AI fund manager trades on-chain, everyone can see:
- What tokens it is buying and selling
- Exact trade amounts and portfolio size
- Total P&L and unrealized losses
- Trading patterns and signal timing

Competitors front-run. Investors panic-sell on unrealized losses. The agent's alpha decays because its strategy is public.

## The Solution: Umbra Privacy

Umbra provides three privacy primitives that solve this:

1. **Encrypted Balances** -- Portfolio value is stored in Umbra's encrypted token accounts. Only the agent (or an authorized auditor) can see the actual balance via their X25519 key.

2. **Confidential Transfers** -- When the AI decides to buy or sell, the transfer amount is hidden on-chain. Observers see that a transfer happened, but not how much. This prevents front-running and copy-trading.

3. **Viewing Keys** -- Hierarchical Poseidon-derived keys (Master -> Yearly -> Monthly -> Daily) that grant read-only access to UTXO activity within a specific time scope. Fund investors get monthly viewing keys to audit performance without exposing the full portfolio to the public.

## How Umbra Integration Works (Core, Not Bolt-On)

Umbra is not a wrapper around a normal swap. The confidential transfer IS the trade execution:

```
AI Prediction (XGBoost + SHAP)
        |
        v
Risk Check (position limits, drawdown throttling)
        |
        v
Umbra SDK: Confidential Transfer
   |-- Amount encrypted on-chain (Arcium MPC)
   |-- Balance updated in encrypted token account
   |-- Viewing key derivable for auditor access
        |
        v
Settlement on Solana (amounts hidden)
        |
        v
Dashboard: decrypted data shown only to owner (via viewing key)
```

Every trade the agent executes flows through Umbra's confidential transfer pipeline. The agent's portfolio balance is NEVER public. Risk limits are enforced BEFORE the confidential transfer executes. Viewing keys are generated per time period for investor transparency without public exposure.

## Architecture

```
+------------------+     +------------------+     +-----------------+
|  Python Backend  |---->| Umbra Service    |---->| Solana Devnet   |
|  (FastAPI:8001)  |     | (Express:8002)   |     |                 |
|                  |     |                  |     | Umbra Program:  |
| - ML Prediction  |     | - @umbra-privacy |     | DSuKkyqGVGgo... |
| - Risk Guardian  |     |   /sdk           |     |                 |
| - Trade Executor |     | - Deposit        |     | Logs Program:   |
| - Position Mgr   |     | - Withdraw       |     | UMBRALog...     |
+------------------+     | - Balance Query  |     +-----------------+
        |                 | - Viewing Keys   |
        v                 +------------------+
+------------------+
|  Next.js Frontend|
|  (:3000)         |
|                  |
| - Encrypted      |
|   Balance View   |
| - Decrypt Button |
| - Viewing Keys   |
| - Privacy Pipeline|
+------------------+
```

### Three-Service Design

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| Backend | Python/FastAPI | 8001 | ML prediction, risk management, trade orchestration |
| Umbra Service | Node.js/Express | 8002 | Wraps @umbra-privacy/sdk for confidential operations |
| Frontend | Next.js/React | 3000 | Dashboard with encrypted balance display and viewing keys |

### Why a TypeScript Sidecar?

The Umbra SDK is TypeScript-only. Rather than trying to call it from Python, we run a thin Express service that exposes the SDK operations over HTTP. The Python backend calls this service when it needs to execute a confidential transfer or query encrypted balances.

## Features

### AI Trading Engine
- **XGBoost classifier** predicting SOL/USDC price direction (15-min horizon)
- **14 technical indicators** including RSI, MACD, Bollinger Bands, ADX, ATR
- **SHAP explainability** showing top 3 features driving each prediction
- **Dynamic position sizing** scaled by volatility with drawdown throttling

### Risk Management
- 8-point risk validation gate (all must pass before any trade)
- ATR-based dynamic stop-loss
- Circuit breaker at 8% drawdown
- Position size throttling based on loss brackets

### Umbra Privacy (Core Integration)
- Encrypted portfolio balances (X25519 shared mode)
- Confidential deposits and withdrawals
- Hierarchical viewing key generation
- On-chain transfer logging with Umbra program reference

### Dashboard
- Encrypted balance cards with "Decrypt" button
- Viewing key generation and management
- Confidential trade pipeline visualization
- Real-time risk state monitoring

## Deployed Program IDs

| Program | Network | Address |
|---------|---------|---------|
| Umbra Privacy | Devnet | `DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ` |
| Umbra Logs | Devnet | `3XzQNmWuWBXTSisTv6xGomsxr38qM1De7nUdvzrxMqzS` |

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16
- Redis 7
- Solana CLI (with devnet wallet at `~/.config/solana/id.json`)

### Quick Start

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Install backend dependencies
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 3. Install Umbra service dependencies
cd ../umbra-service
npm install

# 4. Install frontend dependencies
cd ../frontend
npm install

# 5. Copy and configure environment
cp .env.example .env
# Edit .env with your Birdeye API key and keypair path

# 6. Start all services (in separate terminals)
cd backend && python main.py          # Terminal 1
cd umbra-service && npm run dev       # Terminal 2
cd frontend && npm run dev            # Terminal 3
```

### With Docker

```bash
cp .env.example .env
docker compose up
```

Open http://localhost:3000 to see the dashboard.

## How Viewing Keys Enable Auditable Privacy

The key innovation is **selective transparency**: the fund's portfolio is private by default, but investors can audit performance without exposing the portfolio to everyone.

```
Fund Manager                    Investor A               Public
-----------                     ----------               ------
Full portfolio access           Monthly viewing key      Nothing visible
All trade history               Jan 2025 UTXO activity   Transfer happened (amount hidden)
Generate keys for investors     Read-only, time-scoped   Cannot decrypt balances
Revoke access anytime           Cannot see other months  Cannot see who transferred
```

Viewing keys are derived hierarchically:
```
Master Viewing Key
    |
    +-- 2025 (yearly key)
         |
         +-- January (monthly key) --> share with Investor A
         +-- February (monthly key) --> share with Auditor
         |
         +-- Jan 15 (daily key) --> share for specific audit
```

Sharing a monthly key does NOT expose the yearly key or other months. Each level is derived via Poseidon hashing, making it computationally infeasible to derive a parent key from a child.

## API Endpoints

### Core
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/agent/status` | Agent status with Umbra info |

### Market & Predictions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/market/price` | Current SOL/USDC price |
| GET | `/predict` | Run ML prediction |
| GET | `/predict/model` | Model metadata |

### Umbra Privacy
| Method | Path | Description |
|--------|------|-------------|
| GET | `/umbra/status` | Umbra service status |
| POST | `/umbra/register` | Register with Umbra |
| GET | `/umbra/balances` | Query encrypted balances |
| POST | `/umbra/deposit` | Deposit to encrypted balance |
| POST | `/umbra/withdraw` | Withdraw from encrypted balance |
| POST | `/umbra/viewing-key` | Generate viewing key |

### Trading
| Method | Path | Description |
|--------|------|-------------|
| POST | `/trade/submit-demo` | Full pipeline demo trade |
| GET | `/trades/status` | Executor status |
| GET | `/risk/state` | Risk management state |

## Tech Stack

- **ML**: XGBoost, SHAP, NumPy, scikit-learn
- **Backend**: FastAPI, SQLAlchemy (async), Redis, aiohttp
- **Umbra**: @umbra-privacy/sdk, Express, TypeScript
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Recharts
- **On-chain**: Anchor (Rust), Solana Devnet
- **Infrastructure**: PostgreSQL, Redis, Docker Compose
