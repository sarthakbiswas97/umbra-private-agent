import type { AgentStatus, PredictionResponse, UmbraStatus } from "@/lib/types";

function Pill({ color, label, active }: { color: string; label: string; active: boolean }) {
  const colors: Record<string, string> = {
    amber: active ? "bg-amber-500/15 text-amber-400 ring-amber-500/30" : "bg-gray-800 text-gray-500 ring-gray-700",
    violet: active ? "bg-violet-500/15 text-violet-400 ring-violet-500/30" : "bg-gray-800 text-gray-500 ring-gray-700",
    indigo: active ? "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30" : "bg-gray-800 text-gray-500 ring-gray-700",
  };
  const dotColor: Record<string, string> = {
    amber: active ? "bg-amber-400" : "bg-gray-600",
    violet: active ? "bg-violet-400" : "bg-gray-600",
    indigo: active ? "bg-indigo-400" : "bg-gray-600",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${colors[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[color]} ${active ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

export default function HeroBanner({
  agent,
  prediction,
}: {
  agent: AgentStatus | null;
  prediction: PredictionResponse | null;
}) {
  const price = agent?.latest_price ?? 0;
  const dir = prediction?.prediction?.direction;
  const conf = prediction?.prediction?.confidence;
  const umbra = agent?.umbra;

  return (
    <div className="relative mb-6">
      <div className="flex items-center justify-between flex-wrap gap-6 px-6 py-5 bg-gray-900 rounded-2xl border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Umbra Private Agent</h1>
          <p className="text-xs text-gray-500 mt-0.5">Confidential AI Portfolio Manager</p>
          <p className="text-sm text-gray-400 mt-1 font-mono">SOL / USDC</p>
        </div>

        <div className="text-center">
          <p className="text-4xl font-mono font-bold text-white tabular-nums">
            ${price > 0 ? price.toFixed(2) : "---"}
          </p>
          {dir && conf !== undefined && (
            <p className={`text-sm font-medium mt-1 ${dir === "UP" ? "text-emerald-400" : "text-red-400"}`}>
              {dir === "UP" ? "\u2191" : "\u2193"} {dir} {(conf * 100).toFixed(0)}% confidence
            </p>
          )}
          {!dir && <p className="text-xs text-gray-600 mt-1">Awaiting prediction...</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Pill color="amber" label="AI Model" active={!!prediction} />
          <Pill color="violet" label="Umbra Privacy" active={!!umbra?.enabled} />
          <Pill color="indigo" label="Confidential Tx" active={!!umbra?.registered} />
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-amber-500 via-violet-500 to-indigo-500 rounded-full mx-4 -mt-0.5" />
    </div>
  );
}
