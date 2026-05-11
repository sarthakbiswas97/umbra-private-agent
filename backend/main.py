"""Umbra Private Agent - Confidential AI Portfolio Manager API."""

import hashlib
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select

from config import get_settings
from db import init_db, close_db
from db.database import get_session
from db.models import Decision as DecisionModel
from services import market_data_service, feature_engine, prediction_service
from services.trade_executor import trade_executor
from services.position_manager import position_manager
from services.risk_guardian import risk_guardian
from services.umbra_client import umbra_client
from events import event_publisher

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"Starting {settings.agent_name}...")

    await init_db()
    print("Database initialized")

    await market_data_service.start()
    print("Market data service started")

    if prediction_service.load_model():
        print("ML model loaded")
    else:
        print("Warning: ML model not loaded")

    await trade_executor.start()
    print("Trade executor started")

    if await umbra_client.initialize():
        print("Umbra privacy service connected")
    else:
        print("Umbra service unavailable - operating without privacy layer")

    print(f"{settings.agent_name} is ready!")
    yield

    print("Shutting down...")
    await trade_executor.stop()
    await market_data_service.stop()
    await umbra_client.close()
    await close_db()
    print("Shutdown complete")


app = FastAPI(
    title="Umbra Private Agent - Confidential AI Portfolio Manager",
    description="AI trading agent with Umbra SDK for confidential transfers and auditable privacy",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- Health & Status --

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "agent": settings.agent_name,
        "umbra": umbra_client.is_enabled,
    }


@app.get("/agent/status")
async def agent_status():
    return {
        "agent_name": settings.agent_name,
        "status": "running",
        "latest_price": market_data_service.latest_price,
        "symbol": market_data_service.symbol,
        "umbra": umbra_client.get_status(),
        "trades_today": risk_guardian.state.trades_today,
    }


# -- Market Data --

@app.get("/market/price")
async def get_current_price():
    return {
        "symbol": market_data_service.symbol,
        "price": market_data_service.latest_price,
    }


@app.get("/market/candles")
async def get_candles(limit: int = 100):
    candles = await market_data_service.get_recent_candles(limit=limit)
    return {
        "symbol": market_data_service.symbol,
        "interval": "1m",
        "count": len(candles),
        "candles": [
            {
                "open_time": c.open_time,
                "open": c.open,
                "high": c.high,
                "low": c.low,
                "close": c.close,
                "volume": c.volume,
            }
            for c in candles
        ],
    }


# -- Features & Predictions --

@app.get("/features/compute")
async def compute_features():
    features = await feature_engine.compute_features()
    if features is None:
        return {"error": "Not enough data to compute features"}
    return {
        "symbol": market_data_service.symbol,
        "features": features.to_dict(),
    }


@app.get("/predict")
async def get_prediction():
    features = await feature_engine.compute_features()
    if features is None:
        return {"error": "Not enough candle data to compute features"}
    prediction = await prediction_service.predict_and_publish(features)
    if prediction is None:
        return {"error": "Model not loaded"}
    return {
        "symbol": market_data_service.symbol,
        "prediction": prediction.to_dict(),
    }


@app.get("/predict/latest")
async def get_latest_prediction():
    if prediction_service.latest_prediction is None:
        return {"error": "No prediction available"}
    return {
        "symbol": market_data_service.symbol,
        "prediction": prediction_service.latest_prediction.to_dict(),
    }


@app.get("/predict/model")
async def get_model_info():
    return {"model": prediction_service.get_model_info()}


# -- Trading --

@app.get("/trades/position")
async def get_current_position():
    return {
        "has_position": position_manager.has_position,
        "position": (
            position_manager.position.to_dict()
            if position_manager.has_position
            else None
        ),
        "capital": position_manager.capital,
    }


@app.get("/trades/history")
async def get_trade_history(limit: int = 20):
    trades = trade_executor.trade_history[-limit:]
    return {
        "count": len(trades),
        "trades": [t.to_dict() for t in trades],
    }


@app.post("/trades/close")
async def close_position(reason: str = "manual"):
    if not position_manager.has_position:
        return {"error": "No position to close"}
    price = market_data_service.latest_price
    if not price:
        return {"error": "No current price available"}
    result = await trade_executor.manual_close(price, reason)
    if result is None:
        return {"error": "Failed to close position"}
    return {"success": result.success, "trade": result.to_dict()}


@app.get("/trades/status")
async def get_executor_status():
    return trade_executor.get_status()


# -- Risk --

@app.get("/risk/state")
async def get_risk_state():
    return {
        "state": risk_guardian.state.model_dump(),
        "config": risk_guardian.get_config(),
        "trading_enabled": risk_guardian.is_trading_enabled,
    }


@app.post("/risk/circuit-breaker/reset")
async def reset_circuit_breaker():
    await risk_guardian.reset_circuit_breaker()
    return {"success": True, "trading_enabled": risk_guardian.is_trading_enabled}


# -- Umbra Privacy --

@app.get("/umbra/status")
async def get_umbra_status():
    return umbra_client.get_status()


@app.post("/umbra/register")
async def register_with_umbra():
    if not umbra_client.is_enabled:
        return {"error": "Umbra service not available"}
    success = await umbra_client.register()
    return {"success": success}


@app.get("/umbra/balance")
async def get_encrypted_balance(mint: str = ""):
    if not umbra_client.is_enabled:
        return {"error": "Umbra service not available"}
    if not mint:
        mint = settings.usdc_mint
    balance = await umbra_client.get_encrypted_balance(mint)
    if balance is None:
        return {"error": "Failed to query balance"}
    return {
        "mint": balance.mint,
        "state": balance.state,
        "balance": balance.balance,
        "raw_balance": balance.raw_balance,
    }


@app.get("/umbra/balances")
async def get_all_encrypted_balances():
    if not umbra_client.is_enabled:
        return {"error": "Umbra service not available"}
    balances = await umbra_client.get_all_balances()
    return {
        "count": len(balances),
        "balances": [
            {
                "mint": b.mint,
                "state": b.state,
                "balance": b.balance,
            }
            for b in balances
        ],
    }


@app.post("/umbra/deposit")
async def deposit_to_encrypted(mint: str = "", amount: float = 0.0):
    if not umbra_client.is_enabled:
        return {"error": "Umbra service not available"}
    if not mint:
        mint = settings.usdc_mint
    if amount <= 0:
        return {"error": "Amount must be positive"}
    result = await umbra_client.deposit(mint, amount)
    return {
        "success": result.success,
        "queue_signature": result.queue_signature,
        "callback_signature": result.callback_signature,
        "error": result.error,
    }


@app.post("/umbra/withdraw")
async def withdraw_from_encrypted(mint: str = "", amount: float = 0.0):
    if not umbra_client.is_enabled:
        return {"error": "Umbra service not available"}
    if not mint:
        mint = settings.usdc_mint
    if amount <= 0:
        return {"error": "Amount must be positive"}
    result = await umbra_client.withdraw(mint, amount)
    return {
        "success": result.success,
        "queue_signature": result.queue_signature,
        "callback_signature": result.callback_signature,
        "error": result.error,
    }


@app.post("/umbra/viewing-key")
async def generate_viewing_key(
    scope: str = "monthly",
    year: int = 2025,
    month: int = 1,
    day: int = 1,
):
    if not umbra_client.is_enabled:
        return {"error": "Umbra service not available"}
    vk = await umbra_client.generate_viewing_key(scope, year, month, day)
    if vk is None:
        return {"error": "Failed to generate viewing key"}
    return {
        "scope": vk.scope,
        "year": vk.year,
        "month": vk.month,
        "day": vk.day,
        "key_hex": vk.key_hex,
    }


# -- Demo Trade --

@app.post("/trade/submit-demo")
async def submit_demo_trade():
    """Submit a trade through the full pipeline with Umbra privacy."""
    features = await feature_engine.compute_features()
    prediction = prediction_service.latest_prediction

    price = market_data_service.latest_price or 0.0
    direction = prediction.direction if prediction else "UP"
    confidence = prediction.confidence if prediction else 0.5

    position_bps = int(settings.max_position_size * 10000)
    daily_pnl_bps = int(abs(risk_guardian.state.daily_pnl_pct) * 10000)
    drawdown_bps = int(risk_guardian.state.current_drawdown_pct * 10000)

    max_pos = int(settings.max_position_size * 10000)
    max_loss = int(settings.max_daily_loss * 10000)
    max_dd = int(settings.max_drawdown * 10000)

    risk_passed = (
        position_bps <= max_pos
        and daily_pnl_bps <= max_loss
        and drawdown_bps <= max_dd
    )

    trade_message = (
        f"UMBRA: {direction} SOL/USDC @ ${price:.2f} | "
        f"confidence={confidence:.0%} | pos={position_bps}bps"
    )
    message_hash = hashlib.sha256(trade_message.encode()).hexdigest()

    # Execute confidential transfer via Umbra if available
    umbra_result = None
    if umbra_client.is_enabled and risk_passed:
        value_usd = position_manager.capital * settings.max_position_size
        deposit_result = await umbra_client.deposit(settings.usdc_mint, value_usd)
        umbra_result = {
            "success": deposit_result.success,
            "queue_signature": deposit_result.queue_signature,
            "error": deposit_result.error,
        }

    verdict = "APPROVED" if risk_passed else "REJECTED"
    rejection_reason = None
    if not risk_passed:
        if position_bps > max_pos:
            rejection_reason = f"Position {position_bps}bps exceeds limit {max_pos}bps"
        elif daily_pnl_bps > max_loss:
            rejection_reason = f"Daily loss {daily_pnl_bps}bps exceeds limit {max_loss}bps"
        else:
            rejection_reason = f"Drawdown {drawdown_bps}bps exceeds limit {max_dd}bps"

    return {
        "verdict": verdict,
        "risk_passed": risk_passed,
        "rejection_reason": rejection_reason,
        "trade": {
            "direction": direction,
            "price": price,
            "confidence": confidence,
            "position_bps": position_bps,
            "daily_pnl_bps": daily_pnl_bps,
            "drawdown_bps": drawdown_bps,
            "message": trade_message,
            "message_hash": message_hash,
        },
        "umbra": umbra_result,
        "privacy": {
            "program_id": "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
            "network": settings.umbra_network,
            "transfer_type": "confidential",
            "amount_hidden": True,
        },
    }


# -- Performance --

_ML_DIR = Path(__file__).resolve().parent.parent / "ml"
_BACKTEST_RESULTS_PATH = _ML_DIR / "backtest_results.json"


@app.get("/backtest/results")
async def get_backtest_results():
    if not _BACKTEST_RESULTS_PATH.exists():
        return {"error": "Backtest results not found. Run ml/backtest.py first."}
    with open(_BACKTEST_RESULTS_PATH) as f:
        return json.load(f)


@app.get("/performance/metrics")
async def get_performance_metrics():
    trades = trade_executor.trade_history
    if not trades:
        return {
            "total_trades": 0,
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "max_drawdown_pct": risk_guardian.state.max_drawdown_pct,
        }

    wins = [t for t in trades if t.pnl and t.pnl > 0]
    losses = [t for t in trades if t.pnl and t.pnl < 0]
    total_pnl = sum(t.pnl for t in trades if t.pnl)

    return {
        "total_trades": len(trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate": len(wins) / len(trades) if trades else 0.0,
        "total_pnl": total_pnl,
        "max_drawdown_pct": risk_guardian.state.max_drawdown_pct,
        "capital": position_manager.capital,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
