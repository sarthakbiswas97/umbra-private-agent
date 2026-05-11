export interface AgentStatus {
  agent_name: string;
  status: string;
  latest_price: number;
  symbol: string;
  umbra: UmbraStatus;
  trades_today: number;
}

export interface UmbraStatus {
  enabled: boolean;
  registered: boolean;
  service_url: string;
  network: string;
  program_id: string;
}

export interface EncryptedBalance {
  mint: string;
  state: string;
  balance: number | null;
  raw_balance: string | null;
}

export interface TradeResult {
  success: boolean;
  action: string;
  amount: number;
  price: number;
  reason: string;
  pnl: number | null;
  umbra_signature: string | null;
}

export interface ExecutorStatus {
  running: boolean;
  has_position: boolean;
  position: Record<string, unknown> | null;
  capital: { current: number; base: number; peak: number };
  risk: {
    current_drawdown_pct: number;
    max_drawdown_pct: number;
    throttle_factor: number;
    trading_enabled: boolean;
  };
  umbra: UmbraStatus;
  trades_today: number;
  daily_pnl_pct: number;
  recent_trades: TradeResult[];
}

export interface PredictionResponse {
  symbol: string;
  prediction: {
    direction: string;
    confidence: number;
    shap_explanation: Record<string, { value: number; direction: string }>;
  };
}

export interface ViewingKey {
  scope: string;
  year: number;
  month: number | null;
  day: number | null;
  key_hex: string;
}

export interface UmbraData {
  agent: AgentStatus | null;
  executor: ExecutorStatus | null;
  prediction: PredictionResponse | null;
  balances: EncryptedBalance[];
  connected: boolean;
}
