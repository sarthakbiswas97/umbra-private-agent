"""Configuration management for Umbra Private Agent."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5433/umbra_agent"
    redis_url: str = "redis://localhost:6380"

    # Solana
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_ws_url: str = "wss://api.devnet.solana.com"
    agent_keypair_path: str = ""
    decision_program_id: str = ""

    # Umbra Service
    umbra_service_url: str = "http://localhost:8002"
    umbra_network: str = "devnet"

    # Token Mints (Solana)
    sol_mint: str = "So11111111111111111111111111111111111111112"
    usdc_mint: str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

    # Market Data
    birdeye_api_key: str = ""

    # Jupiter
    jupiter_api_url: str = "https://api.jup.ag"

    # Agent Config
    agent_name: str = "Umbra-Alpha"
    max_position_size: float = 0.05
    max_daily_loss: float = 0.03
    max_drawdown: float = 0.10
    trade_interval_seconds: int = 60

    # ML Model
    model_path: str = "ml/models/xgb_v1.joblib"
    prediction_threshold: float = 0.65
    confidence_threshold: float = 0.55

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8001

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        protected_namespaces = ('settings_',)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
