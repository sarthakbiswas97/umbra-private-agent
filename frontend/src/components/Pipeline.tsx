import type { AgentStatus, PredictionResponse, ExecutorStatus } from "@/lib/types";

function Node({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub?: string; color: string; icon: string;
}) {
  const bg: Record<string, string> = {
    gray: "bg-gray-800/60 border-gray-700",
    amber: "bg-amber-500/10 border-amber-500/30",
    violet: "bg-violet-500/10 border-violet-500/30",
    indigo: "bg-indigo-500/10 border-indigo-500/30",
    emerald: "bg-emerald-500/10 border-emerald-500/30",
    red: "bg-red-500/10 border-red-500/30",
  };
  const text: Record<string, string> = {
    gray: "text-gray-300", amber: "text-amber-400", violet: "text-violet-400",
    indigo: "text-indigo-400", emerald: "text-emerald-400", red: "text-red-400",
  };

  return (
    <div className={`flex flex-col items-center justify-center w-36 h-24 rounded-xl border ${bg[color]} px-3`}>
      <span className="text-lg mb-1">{icon}</span>
      <span className={`text-xs font-semibold uppercase tracking-wider ${text[color]}`}>{label}</span>
      <span className="text-sm font-mono text-white mt-0.5">{value}</span>
      {sub && <span className="text-[10px] text-gray-500">{sub}</span>}
    </div>
  );
}

function Arrow({ color = "gray" }: { color?: string }) {
  const borderColor: Record<string, string> = {
    gray: "border-gray-700", amber: "border-amber-500/40",
    violet: "border-violet-500/40", indigo: "border-indigo-500/40",
  };
  return (
    <div className="flex items-center px-1">
      <div className={`w-8 border-t-2 border-dashed ${borderColor[color]} pipeline-line`} />
      <div className={`w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] ${
        color === "amber" ? "border-l-amber-500/60" :
        color === "violet" ? "border-l-violet-500/60" :
        color === "indigo" ? "border-l-indigo-500/60" :
        "border-l-gray-600"
      }`} />
    </div>
  );
}

export default function Pipeline({
  agent, prediction, executor,
}: {
  agent: AgentStatus | null;
  prediction: PredictionResponse | null;
  executor: ExecutorStatus | null;
}) {
  const price = agent?.latest_price;
  const dir = prediction?.prediction?.direction;
  const conf = prediction?.prediction?.confidence;
  const umbra = agent?.umbra;
  const lastTrade = executor?.recent_trades?.length
    ? executor.recent_trades[executor.recent_trades.length - 1]
    : null;

  const resultColor = lastTrade ? (lastTrade.success ? "emerald" : "red") : "gray";
  const resultValue = lastTrade
    ? (lastTrade.success ? lastTrade.action : "REJECTED")
    : "Waiting...";

  return (
    <div className="mb-6 p-5 bg-gray-900 rounded-2xl border border-gray-800">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Confidential Trade Pipeline
      </h2>
      <div className="flex items-center justify-center overflow-x-auto gap-0 py-2">
        <Node
          icon={"\u{1F4C8}"}
          label="Market Data"
          value={price ? `$${price.toFixed(2)}` : "---"}
          sub="Birdeye / Jupiter"
          color="gray"
        />
        <Arrow color="amber" />
        <Node
          icon={"\u{1F9E0}"}
          label="AI Prediction"
          value={dir && conf ? `${dir} ${(conf * 100).toFixed(0)}%` : "---"}
          sub="XGBoost + SHAP"
          color="amber"
        />
        <Arrow color="violet" />
        <Node
          icon={"\u{1F6E1}\uFE0F"}
          label="Risk Check"
          value={executor?.risk?.trading_enabled ? "PASSED" : "HALTED"}
          sub="Position / Drawdown"
          color="violet"
        />
        <Arrow color="indigo" />
        <Node
          icon={"\u{1F510}"}
          label="Umbra Transfer"
          value={umbra?.enabled ? "Confidential" : "Disabled"}
          sub="Amount hidden on-chain"
          color="indigo"
        />
        <Arrow color={resultColor} />
        <Node
          icon={lastTrade?.success ? "\u2705" : "\u23F3"}
          label="Settlement"
          value={resultValue}
          sub={lastTrade?.umbra_signature ? "Private" : ""}
          color={resultColor}
        />
      </div>
    </div>
  );
}
