"use client";

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BACKTEST_SUMMARY, EQUITY_CURVE, MODEL_METRICS, SAMPLE_TRADES } from "@/lib/backtest-data";

function Metric({ label, value, sub, color = "text-white" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-mono font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BacktestPage() {
  const s = BACKTEST_SUMMARY;
  const m = MODEL_METRICS;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Backtest Results</h1>
        <p className="text-xs text-gray-500 mt-1">
          XGBoost model tested on {m.training.samples.toLocaleString()} candles (1-min SOL/USDC) over {s.period}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Metric label="Total Return" value={`+${s.totalReturn}%`} color="text-emerald-400" sub={`$${s.initialCapital} -> $${s.finalCapital}`} />
        <Metric label="Win Rate" value={`${s.winRate}%`} color="text-emerald-400" sub={`${s.totalTrades} trades`} />
        <Metric label="Sharpe Ratio" value={s.sharpeRatio.toFixed(2)} color="text-amber-400" sub="Risk-adjusted" />
        <Metric label="Max Drawdown" value={`-${s.maxDrawdown}%`} color="text-red-400" sub="Peak to trough" />
      </div>

      {/* Equity curve */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-4">Equity Curve</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={EQUITY_CURVE}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="index" stroke="#4b5563" tick={{ fontSize: 10 }} />
            <YAxis
              stroke="#4b5563"
              tick={{ fontSize: 10 }}
              domain={["dataMin - 100", "dataMax + 100"]}
              tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Equity"]}
            />
            <Area type="monotone" dataKey="equity" stroke="#8b5cf6" fill="url(#eqGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* More metrics */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Performance Breakdown</h2>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Profit Factor" value={s.profitFactor.toFixed(2)} sub="Gross profit / loss" />
            <Metric label="Avg Win" value={`+${s.avgWin}%`} color="text-emerald-400" />
            <Metric label="Avg Loss" value={`${s.avgLoss}%`} color="text-red-400" />
            <Metric label="Model Accuracy" value={`${(m.accuracy * 100).toFixed(1)}%`} sub={`+${(m.improvement * 100).toFixed(1)}% over random`} />
          </div>
        </div>

        {/* Feature importance */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Feature Importance (SHAP)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.features} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" stroke="#4b5563" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
              <YAxis dataKey="name" type="category" stroke="#4b5563" tick={{ fontSize: 10 }} width={100} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Importance"]}
              />
              <Bar dataKey="importance" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sample trades */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Sample Trades</h2>
        <div className="space-y-2">
          {SAMPLE_TRADES.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  t.action === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {t.action}
                </span>
                <span className="text-xs text-gray-400">{t.size} SOL @ ${t.price}</span>
                <span className="text-[10px] text-gray-600 hidden sm:inline">{t.reason}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500">{(t.confidence * 100).toFixed(0)}% conf</span>
                <span className={`text-xs font-mono ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
