# Umbra Private Agent

## Project Structure

```
backend/          Python FastAPI (port 8001) - ML, risk, trade orchestration
umbra-service/    Node.js Express (port 8002) - Umbra SDK wrapper
frontend/         Next.js (port 3000) - Dashboard
programs/         Anchor programs (Solana)
ml/               ML training pipeline and model bundles
```

## Key Design Decisions

- Umbra SDK is TypeScript-only, so we run a sidecar Express service
- Python backend calls umbra-service over HTTP for confidential operations
- The Anchor program (`umbra_logs`) is for decision/transfer LOGGING only
- Actual privacy (encrypted balances, confidential transfers) is handled by Umbra's own program
- No CPI from our program to Umbra -- they operate independently

## Running Locally

```bash
docker compose up -d postgres redis
cd backend && python main.py          # Terminal 1
cd umbra-service && npm run dev       # Terminal 2
cd frontend && npm run dev            # Terminal 3
```

## Environment

- Solana Devnet
- Umbra Devnet program: DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ
- Wallet: ~/.config/solana/id.json (~18 SOL on devnet)
