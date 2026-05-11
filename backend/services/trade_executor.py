"""Trade Executor Service - Orchestrates trading decisions with Umbra privacy.

Flow:
1. Subscribe to prediction events
2. Evaluate entry/exit conditions
3. Run risk checks
4. Execute confidential transfers via Umbra
5. Log decisions for audit
"""

import uuid
import json
import asyncio
import hashlib
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, asdict

from events.subscriber import event_subscriber
from events.publisher import event_publisher
from services.position_manager import position_manager
from services.risk_guardian import risk_guardian
from services.umbra_client import umbra_client
from services.feature_engine import feature_engine
from models.decision import (
    TradeAction,
    DecisionRecord,
    MarketState,
    ModelOutput,
    StrategyDecision,
    RiskValidation,
)
from db.database import get_session
from db.models import Decision as DecisionModel, TradeExecution as TradeExecutionModel

from config import get_settings

settings = get_settings()

ENTRY_CONFIDENCE_THRESHOLD = 0.60
EXIT_REVERSAL_CONFIDENCE = 0.55
BASE_POSITION_SIZE_PCT = 0.03


@dataclass
class TradeResult:
    """Result of a trade execution."""
    success: bool
    trade_id: Optional[str]
    decision_id: str
    action: str
    amount: float
    price: float
    reason: str
    pnl: Optional[float] = None
    umbra_signature: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


class TradeExecutorService:
    """Main trading orchestrator with Umbra confidential transfers."""

    def __init__(self):
        self._running = False
        self._last_prediction: Optional[dict] = None
        self.trade_history: list[TradeResult] = []

    async def start(self):
        await event_publisher.connect()
        await event_subscriber.connect()
        await position_manager.load_from_redis()
        await risk_guardian.load_state()

        event_subscriber.on("event:prediction_ready", self._on_prediction)
        await event_subscriber.start()

        self._running = True
        print("TradeExecutorService started (Umbra-enabled)")

    async def stop(self):
        self._running = False
        await event_subscriber.disconnect()
        print("TradeExecutorService stopped")

    async def _on_prediction(self, prediction: dict):
        self._last_prediction = prediction

        price = prediction.get("price", 0.0)
        direction = prediction.get("direction", "")
        confidence = prediction.get("confidence", 0.0)
        shap = prediction.get("shap_explanation", {})

        print(
            f"\n[{datetime.now().strftime('%H:%M:%S')}] "
            f"Prediction: {direction} ({confidence:.1%}) @ ${price:.2f}"
        )

        if position_manager.has_position:
            await position_manager.update_price(price)

        action, reason, position_size = await self._evaluate_action(
            direction, confidence, price
        )

        if action == TradeAction.HOLD:
            print(f"  -> HOLD: {reason}")
            return

        decision = await self._build_decision(
            price=price,
            direction=direction,
            confidence=confidence,
            shap=shap,
            action=action,
            reason=reason,
            position_size_pct=position_size,
        )

        result = await self._execute_trade(decision, price, position_size)

        if result.success:
            print(f"  -> {result.action}: {result.amount:.6f} SOL @ ${result.price:.2f}")
            if result.pnl is not None:
                print(f"     PnL: ${result.pnl:.2f}")
            if result.umbra_signature:
                print(f"     Umbra tx: {result.umbra_signature[:16]}...")
        else:
            print(f"  -> FAILED: {result.reason}")

    async def _evaluate_action(
        self,
        direction: str,
        confidence: float,
        price: float,
    ) -> tuple[TradeAction, str, float]:
        if position_manager.has_position:
            return await self._evaluate_exit(direction, confidence, price)
        return await self._evaluate_entry(direction, confidence, price)

    async def _evaluate_entry(
        self,
        direction: str,
        confidence: float,
        price: float,
    ) -> tuple[TradeAction, str, float]:
        if direction != "UP":
            return TradeAction.HOLD, "Direction is DOWN (long-only strategy)", 0.0

        if confidence < ENTRY_CONFIDENCE_THRESHOLD:
            return (
                TradeAction.HOLD,
                f"Confidence {confidence:.1%} below threshold {ENTRY_CONFIDENCE_THRESHOLD:.0%}",
                0.0,
            )

        features = feature_engine.latest_features
        volatility = features.volatility if features else 0.02

        position_size = risk_guardian.calculate_position_size(
            base_size_pct=BASE_POSITION_SIZE_PCT,
            current_volatility=volatility,
        )

        if position_size < 0.005:
            throttle_factor = risk_guardian.get_throttle_factor()
            return (
                TradeAction.HOLD,
                f"Position size throttled to {position_size:.1%} (throttle: {throttle_factor:.0%})",
                0.0,
            )

        risk_result = await risk_guardian.check_trade(
            action="BUY",
            position_size_pct=position_size,
            current_exposure_pct=0.0,
        )

        if not risk_result.can_trade:
            return (
                TradeAction.HOLD,
                f"Risk check failed: {', '.join(risk_result.violations)}",
                0.0,
            )

        return (
            TradeAction.BUY,
            f"Entry signal: {direction} with {confidence:.1%} confidence (size: {position_size:.1%})",
            position_size,
        )

    async def _evaluate_exit(
        self,
        direction: str,
        confidence: float,
        price: float,
    ) -> tuple[TradeAction, str, float]:
        pos = position_manager.position
        pnl_pct = pos.unrealized_pnl_pct

        features = feature_engine.latest_features
        atr = features.atr if features else 0.0

        if atr > 0:
            if risk_guardian.check_stop_loss_dynamic(pos.entry_price, price, atr):
                stop_price = risk_guardian.calculate_stop_loss_price(pos.entry_price, atr)
                return TradeAction.SELL, f"ATR stop-loss triggered at ${price:.2f} (stop: ${stop_price:.2f})", 0.0
        else:
            if risk_guardian.check_stop_loss(pnl_pct):
                return TradeAction.SELL, f"Stop loss triggered at {pnl_pct:.1%}", 0.0

        if risk_guardian.check_take_profit(pnl_pct):
            return TradeAction.SELL, f"Take profit triggered at {pnl_pct:.1%}", 0.0

        if direction == "DOWN" and confidence >= EXIT_REVERSAL_CONFIDENCE:
            return TradeAction.SELL, f"Reversal signal: DOWN with {confidence:.1%} confidence", 0.0

        age_seconds = position_manager.get_position_age_seconds()
        if risk_guardian.check_position_age(age_seconds):
            return TradeAction.SELL, f"Position age {age_seconds/60:.0f}min exceeds limit", 0.0

        return TradeAction.HOLD, f"Holding position (PnL: {pnl_pct:+.1%})", 0.0

    async def _build_decision(
        self,
        price: float,
        direction: str,
        confidence: float,
        shap: dict,
        action: TradeAction,
        reason: str,
        position_size_pct: float = 0.0,
    ) -> DecisionRecord:
        decision_id = str(uuid.uuid4())

        features = feature_engine.latest_features
        market_state = MarketState(
            price=price,
            rsi=features.rsi if features else 50.0,
            macd=features.macd if features else 0.0,
            macd_signal=features.macd_signal if features else 0.0,
            ema_ratio=features.ema_ratio if features else 1.0,
            volatility=features.volatility if features else 0.02,
            volume_spike=features.volume_spike if features else 1.0,
            momentum=features.momentum if features else 0.0,
            bollinger_position=features.bollinger_position if features else 0.5,
        )

        model_output = ModelOutput(
            probability_up=confidence if direction == "UP" else 1 - confidence,
            confidence=confidence,
            shap_values={k: v.get("value", 0) for k, v in shap.items()},
        )

        strategy_decision = StrategyDecision(
            action=action,
            reason=reason,
            position_size_pct=position_size_pct if action == TradeAction.BUY else 0.0,
        )

        risk_result = await risk_guardian.check_trade(
            action=action.value,
            position_size_pct=position_size_pct,
            current_exposure_pct=(
                position_manager.position.value_usd / position_manager.capital
                if position_manager.has_position
                else 0.0
            ),
        )

        risk_validation = RiskValidation(
            passed=risk_result.can_trade,
            portfolio_exposure_pct=risk_guardian.state.total_exposure_pct,
            daily_pnl_pct=risk_guardian.state.daily_pnl_pct,
            current_drawdown_pct=risk_guardian.state.current_drawdown_pct,
            risk_score=risk_result.risk_score,
            violations=risk_result.violations,
        )

        return DecisionRecord(
            id=decision_id,
            timestamp=datetime.now(timezone.utc),
            asset="SOL/USDC",
            market_state=market_state,
            model_output=model_output,
            strategy_decision=strategy_decision,
            risk_validation=risk_validation,
        )

    async def _execute_trade(
        self,
        decision: DecisionRecord,
        price: float,
        position_size_pct: float = BASE_POSITION_SIZE_PCT,
    ) -> TradeResult:
        """Execute trade with Umbra confidential transfer."""
        action = decision.strategy_decision.action
        decision_hash = decision.compute_hash()
        decision.trade_intent_hash = decision_hash

        umbra_sig = None

        if action == TradeAction.BUY:
            size = position_manager.calculate_position_size(price, position_size_pct)

            # Execute confidential deposit via Umbra
            if umbra_client.is_enabled:
                value_usd = size * price
                result = await umbra_client.deposit(
                    mint=settings.usdc_mint,
                    amount=value_usd,
                )
                if result.success:
                    umbra_sig = result.queue_signature
                    print(f"  [Umbra] Confidential deposit: {value_usd:.2f} USDC")
                else:
                    print(f"  [Umbra] Deposit failed (proceeding): {result.error}")

            try:
                await position_manager.open_position(
                    side="LONG",
                    size=size,
                    entry_price=price,
                    decision_id=decision.id,
                )
            except ValueError as e:
                return TradeResult(
                    success=False,
                    trade_id=None,
                    decision_id=decision.id,
                    action="BUY",
                    amount=size,
                    price=price,
                    reason=str(e),
                )

            current_capital = position_manager.get_current_capital()
            await risk_guardian.record_trade(current_capital=current_capital)

            await self._save_decision(decision)
            trade_id = await self._save_trade_execution(decision, "BUY", size, price)

            trade_result = TradeResult(
                success=True,
                trade_id=trade_id,
                decision_id=decision.id,
                action="BUY",
                amount=size,
                price=price,
                reason=decision.strategy_decision.reason,
                umbra_signature=umbra_sig,
            )

        elif action == TradeAction.SELL:
            if not position_manager.has_position:
                return TradeResult(
                    success=False,
                    trade_id=None,
                    decision_id=decision.id,
                    action="SELL",
                    amount=0.0,
                    price=price,
                    reason="No position to close",
                )

            pos = position_manager.position
            size = pos.size

            # Execute confidential withdrawal via Umbra
            if umbra_client.is_enabled:
                value_usd = size * price
                result = await umbra_client.withdraw(
                    mint=settings.usdc_mint,
                    amount=value_usd,
                )
                if result.success:
                    umbra_sig = result.queue_signature
                    print(f"  [Umbra] Confidential withdrawal: {value_usd:.2f} USDC")
                else:
                    print(f"  [Umbra] Withdrawal failed (proceeding): {result.error}")

            closed_pos, realized_pnl = await position_manager.close_position(
                exit_price=price,
                reason=decision.strategy_decision.reason,
                decision_id=decision.id,
            )

            position_manager.update_capital(realized_pnl)

            pnl_pct = realized_pnl / position_manager.capital
            current_capital = position_manager.get_current_capital()
            await risk_guardian.record_trade(pnl=pnl_pct, current_capital=current_capital)

            await self._save_decision(decision)
            trade_id = await self._save_trade_execution(
                decision, "SELL", size, price, realized_pnl
            )

            trade_result = TradeResult(
                success=True,
                trade_id=trade_id,
                decision_id=decision.id,
                action="SELL",
                amount=size,
                price=price,
                reason=decision.strategy_decision.reason,
                pnl=realized_pnl,
                umbra_signature=umbra_sig,
            )

        else:
            return TradeResult(
                success=False,
                trade_id=None,
                decision_id=decision.id,
                action="HOLD",
                amount=0.0,
                price=price,
                reason="No action taken",
            )

        self.trade_history.append(trade_result)

        await event_publisher.publish(
            "event:trade_executed",
            trade_result.to_dict(),
        )

        return trade_result

    async def _save_decision(self, decision: DecisionRecord):
        try:
            timestamp = (
                decision.timestamp.replace(tzinfo=None)
                if decision.timestamp.tzinfo
                else decision.timestamp
            )
            async with get_session() as session:
                db_decision = DecisionModel(
                    id=decision.id,
                    timestamp=timestamp,
                    asset=decision.asset,
                    price=decision.market_state.price,
                    rsi=decision.market_state.rsi,
                    macd=decision.market_state.macd,
                    volatility=decision.market_state.volatility,
                    probability_up=decision.model_output.probability_up,
                    confidence=decision.model_output.confidence,
                    shap_values_json=json.dumps(decision.model_output.shap_values),
                    action=decision.strategy_decision.action.value,
                    reason=decision.strategy_decision.reason,
                    position_size_pct=decision.strategy_decision.position_size_pct,
                    risk_passed=decision.risk_validation.passed,
                    risk_score=decision.risk_validation.risk_score,
                    risk_violations_json=json.dumps(decision.risk_validation.violations),
                    execution_status="executed",
                    decision_hash=decision.trade_intent_hash,
                )
                session.add(db_decision)
                await session.flush()
        except Exception as e:
            print(f"Failed to save decision: {e}")

    async def _save_trade_execution(
        self,
        decision: DecisionRecord,
        action: str,
        amount: float,
        price: float,
        pnl: float = 0.0,
    ) -> str:
        trade_id = str(uuid.uuid4())
        try:
            timestamp = datetime.utcnow()
            async with get_session() as session:
                trade = TradeExecutionModel(
                    id=trade_id,
                    decision_id=decision.id,
                    timestamp=timestamp,
                    asset="SOL",
                    action=action,
                    amount=amount,
                    price=price,
                    value_usd=amount * price,
                    status="executed",
                    slippage_bps=0,
                )
                session.add(trade)
                await session.flush()
        except Exception as e:
            print(f"Failed to save trade: {e}")
        return trade_id

    async def manual_close(self, price: float, reason: str = "manual") -> Optional[TradeResult]:
        if not position_manager.has_position:
            return None
        decision = await self._build_decision(
            price=price,
            direction="DOWN",
            confidence=1.0,
            shap={},
            action=TradeAction.SELL,
            reason=f"Manual close: {reason}",
            position_size_pct=0.0,
        )
        return await self._execute_trade(decision, price, position_size_pct=0.0)

    def get_status(self) -> dict:
        state = risk_guardian.state
        return {
            "running": self._running,
            "has_position": position_manager.has_position,
            "position": (
                position_manager.position.to_dict()
                if position_manager.has_position
                else None
            ),
            "capital": {
                "current": position_manager.get_current_capital(),
                "base": position_manager.capital,
                "peak": state.peak_capital,
            },
            "risk": {
                "current_drawdown_pct": state.current_drawdown_pct,
                "max_drawdown_pct": state.max_drawdown_pct,
                "throttle_factor": risk_guardian.get_throttle_factor(),
                "trading_enabled": risk_guardian.is_trading_enabled,
            },
            "umbra": umbra_client.get_status(),
            "trades_today": state.trades_today,
            "daily_pnl_pct": state.daily_pnl_pct,
            "last_prediction": self._last_prediction,
            "recent_trades": [t.to_dict() for t in self.trade_history[-10:]],
        }


trade_executor = TradeExecutorService()
