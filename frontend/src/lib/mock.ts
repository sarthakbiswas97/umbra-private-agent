import type { UmbraData, EncryptedBalance } from "./types";

const MOCK_BALANCES: EncryptedBalance[] = [
  {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    state: "shared",
    balance: 8472.31,
    raw_balance: "8472310000",
  },
  {
    mint: "So11111111111111111111111111111111111111112",
    state: "shared",
    balance: 52.847,
    raw_balance: "52847000000",
  },
  {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    state: "mxe",
    balance: null,
    raw_balance: null,
  },
];

export function getMockData(): UmbraData {
  const now = Date.now();
  const jitter = Math.sin(now / 10000) * 3;
  const price = 93.0 + jitter;

  return {
    agent: {
      agent_name: "Umbra-Alpha",
      status: "running",
      latest_price: parseFloat(price.toFixed(2)),
      symbol: "SOLUSDC",
      umbra: {
        enabled: true,
        registered: true,
        service_url: "http://localhost:8002",
        network: "devnet",
        program_id: "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
      },
      trades_today: 7,
    },
    executor: {
      running: true,
      has_position: true,
      position: {
        id: "demo-pos-1",
        asset: "SOL",
        side: "LONG",
        size: 1.842,
        entry_price: 91.50,
        current_price: price,
        unrealized_pnl: parseFloat(((price - 91.50) * 1.842).toFixed(2)),
        unrealized_pnl_pct: parseFloat(((price - 91.50) / 91.50).toFixed(4)),
      },
      capital: { current: 10243.18, base: 10000, peak: 10380.0 },
      risk: {
        current_drawdown_pct: 0.013,
        max_drawdown_pct: 0.032,
        throttle_factor: 1.0,
        trading_enabled: true,
      },
      umbra: {
        enabled: true,
        registered: true,
        service_url: "http://localhost:8002",
        network: "devnet",
        program_id: "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
      },
      trades_today: 7,
      daily_pnl_pct: 0.0089,
      recent_trades: [
        {
          success: true,
          action: "BUY",
          amount: 1.842,
          price: 91.50,
          reason: "Entry signal: UP with 72% confidence (size: 3.1%)",
          pnl: null,
          umbra_signature: "4hExLDN83ZnYM7DP2s8u9AAqRLy8jmWusJu5h2uBphiV",
        },
        {
          success: true,
          action: "SELL",
          amount: 2.105,
          price: 169.84,
          reason: "Take profit triggered at 3.8%",
          pnl: 12.47,
          umbra_signature: "2K1QbpNV7fxR3wwyaC5fCeWnWayd1wLitSx3JDWm8Hu5",
        },
        {
          success: true,
          action: "BUY",
          amount: 1.95,
          price: 168.22,
          reason: "Entry signal: UP with 68% confidence (size: 2.8%)",
          pnl: null,
          umbra_signature: "YWGSar27XDpjRv6cjk6PFHeALTMp1QjCcPMEjgGxXhwW",
        },
        {
          success: true,
          action: "SELL",
          amount: 1.95,
          price: 171.55,
          reason: "Reversal signal: DOWN with 61% confidence",
          pnl: 6.49,
          umbra_signature: "M5ZvpUMzSoWZZqLs6yBCCjG5RBs1wcP3cMkWbSKvNp6q",
        },
      ],
    },
    prediction: {
      symbol: "SOLUSDC",
      prediction: {
        direction: jitter > 0 ? "UP" : "DOWN",
        confidence: 0.72 + Math.abs(jitter) * 0.01,
        shap_explanation: {
          momentum: { value: 0.1823, direction: "pushes UP" },
          rsi: { value: -0.0941, direction: "pushes DOWN" },
          ema_ratio: { value: 0.0687, direction: "pushes UP" },
        },
      },
    },
    balances: MOCK_BALANCES,
    connected: true,
  };
}
