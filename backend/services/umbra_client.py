"""HTTP bridge to the Umbra TypeScript service.

Communicates with the umbra-service (port 8002) which wraps
the @umbra-privacy/sdk for confidential transfers, encrypted
balance queries, and viewing key management.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import aiohttp

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class UmbraTransferResult:
    """Result of a confidential transfer via Umbra."""
    success: bool
    queue_signature: Optional[str] = None
    callback_signature: Optional[str] = None
    error: Optional[str] = None


@dataclass
class EncryptedBalance:
    """Encrypted balance state for a token mint."""
    mint: str
    state: str  # "shared", "mxe", "uninitialized", "non_existent"
    balance: Optional[float] = None
    raw_balance: Optional[str] = None


@dataclass
class ViewingKey:
    """Viewing key for auditable privacy."""
    scope: str  # "monthly", "daily", "yearly"
    year: int
    month: Optional[int] = None
    day: Optional[int] = None
    key_hex: str = ""


class UmbraClient:
    """HTTP client for the Umbra privacy service."""

    def __init__(self):
        self._base_url = settings.umbra_service_url
        self._http: Optional[aiohttp.ClientSession] = None
        self._registered = False
        self._initialized = False

    @property
    def is_enabled(self) -> bool:
        return self._initialized

    async def initialize(self) -> bool:
        """Initialize the HTTP client and check Umbra service health."""
        try:
            self._http = aiohttp.ClientSession()
            async with self._http.get(f"{self._base_url}/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self._initialized = True
                    self._registered = data.get("registered", False)
                    logger.info("Umbra service connected: %s", data)
                    return True
                logger.warning("Umbra service unhealthy: %d", resp.status)
                return False
        except Exception as e:
            logger.warning("Umbra service unavailable: %s", e)
            return False

    async def close(self):
        """Close the HTTP session."""
        if self._http:
            await self._http.close()
            self._http = None

    async def register(self) -> bool:
        """Register user with Umbra (confidential + anonymous)."""
        try:
            async with self._http.post(f"{self._base_url}/register") as resp:
                data = await resp.json()
                if data.get("success"):
                    self._registered = True
                    logger.info("Registered with Umbra")
                    return True
                logger.warning("Umbra registration failed: %s", data)
                return False
        except Exception as e:
            logger.error("Umbra registration error: %s", e)
            return False

    async def deposit(self, mint: str, amount: float) -> UmbraTransferResult:
        """Deposit tokens from public balance into encrypted balance."""
        try:
            async with self._http.post(
                f"{self._base_url}/deposit",
                json={"mint": mint, "amount": amount},
            ) as resp:
                data = await resp.json()
                if data.get("success"):
                    return UmbraTransferResult(
                        success=True,
                        queue_signature=data.get("queueSignature"),
                        callback_signature=data.get("callbackSignature"),
                    )
                return UmbraTransferResult(
                    success=False,
                    error=data.get("error", "Unknown error"),
                )
        except Exception as e:
            return UmbraTransferResult(success=False, error=str(e))

    async def withdraw(self, mint: str, amount: float) -> UmbraTransferResult:
        """Withdraw tokens from encrypted balance to public balance."""
        try:
            async with self._http.post(
                f"{self._base_url}/withdraw",
                json={"mint": mint, "amount": amount},
            ) as resp:
                data = await resp.json()
                if data.get("success"):
                    return UmbraTransferResult(
                        success=True,
                        queue_signature=data.get("queueSignature"),
                        callback_signature=data.get("callbackSignature"),
                    )
                return UmbraTransferResult(
                    success=False,
                    error=data.get("error", "Unknown error"),
                )
        except Exception as e:
            return UmbraTransferResult(success=False, error=str(e))

    async def get_encrypted_balance(self, mint: str) -> Optional[EncryptedBalance]:
        """Query encrypted balance for a token mint."""
        try:
            async with self._http.get(
                f"{self._base_url}/balance",
                params={"mint": mint},
            ) as resp:
                data = await resp.json()
                return EncryptedBalance(
                    mint=data.get("mint", mint),
                    state=data.get("state", "non_existent"),
                    balance=data.get("balance"),
                    raw_balance=data.get("rawBalance"),
                )
        except Exception as e:
            logger.error("Balance query error: %s", e)
            return None

    async def get_all_balances(self) -> list[EncryptedBalance]:
        """Query all encrypted balances."""
        try:
            async with self._http.get(f"{self._base_url}/balances") as resp:
                data = await resp.json()
                return [
                    EncryptedBalance(
                        mint=b["mint"],
                        state=b["state"],
                        balance=b.get("balance"),
                        raw_balance=b.get("rawBalance"),
                    )
                    for b in data.get("balances", [])
                ]
        except Exception as e:
            logger.error("Balances query error: %s", e)
            return []

    async def generate_viewing_key(
        self,
        scope: str = "monthly",
        year: int = 2025,
        month: int = 1,
        day: int = 1,
    ) -> Optional[ViewingKey]:
        """Generate a viewing key for a specific time scope."""
        try:
            async with self._http.post(
                f"{self._base_url}/viewing-keys/generate",
                json={
                    "scope": scope,
                    "year": year,
                    "month": month,
                    "day": day,
                },
            ) as resp:
                data = await resp.json()
                if data.get("success"):
                    return ViewingKey(
                        scope=scope,
                        year=year,
                        month=month if scope in ("monthly", "daily") else None,
                        day=day if scope == "daily" else None,
                        key_hex=data.get("keyHex", ""),
                    )
                return None
        except Exception as e:
            logger.error("Viewing key generation error: %s", e)
            return None

    def get_status(self) -> dict:
        """Get Umbra client status."""
        return {
            "enabled": self._initialized,
            "registered": self._registered,
            "service_url": self._base_url,
            "network": settings.umbra_network,
            "program_id": "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
        }


umbra_client = UmbraClient()
