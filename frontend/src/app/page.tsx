"use client";

import { useUmbraData } from "@/lib/api";
import HeroBanner from "@/components/HeroBanner";
import EncryptedBalances from "@/components/EncryptedBalances";
import Pipeline from "@/components/Pipeline";
import ViewingKeys from "@/components/ViewingKeys";
import UmbraCard from "@/components/UmbraCard";

export default function Home() {
  const data = useUmbraData();

  if (!data.connected) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="w-12 h-12 bg-violet-500/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-violet-400 text-xl font-bold">U</span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Connecting to Umbra Private Agent...
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Loading demo mode...
          </p>
          <div className="mt-4 w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {data.demo && (
        <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 font-medium">
              Demo Mode -- showing simulated data. Start backend for live trading.
            </span>
          </div>
          <span className="text-[10px] text-amber-500/60 font-mono">Solana Devnet</span>
        </div>
      )}

      <HeroBanner agent={data.agent} prediction={data.prediction} />

      <Pipeline
        agent={data.agent}
        prediction={data.prediction}
        executor={data.executor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EncryptedBalances balances={data.balances} />
        <ViewingKeys />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <UmbraCard umbra={data.agent?.umbra} />

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Risk State</h2>
          {data.executor ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Capital</p>
                  <p className="text-lg font-mono text-white mt-1">
                    ${data.executor.capital.current.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Drawdown</p>
                  <p className={`text-lg font-mono mt-1 ${
                    data.executor.risk.current_drawdown_pct > 0.05 ? "text-red-400" : "text-white"
                  }`}>
                    {(data.executor.risk.current_drawdown_pct * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Trades Today</p>
                  <p className="text-lg font-mono text-white mt-1">
                    {data.executor.trades_today}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Throttle</p>
                  <p className="text-lg font-mono text-white mt-1">
                    {(data.executor.risk.throttle_factor * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  data.executor.risk.trading_enabled ? "bg-emerald-500" : "bg-red-500"
                }`} />
                <span className="text-xs text-gray-400">
                  {data.executor.risk.trading_enabled ? "Trading enabled" : "Trading halted"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Loading risk state...</p>
          )}
        </div>
      </div>

      {/* Recent confidential trades */}
      {data.executor?.recent_trades && data.executor.recent_trades.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Recent Confidential Trades</h2>
          <div className="space-y-2">
            {data.executor.recent_trades.slice().reverse().map((trade, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    trade.action === "BUY"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}>
                    {trade.action}
                  </span>
                  <span className="text-xs text-gray-400">
                    {trade.amount.toFixed(4)} SOL @ ${trade.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-600 hidden sm:inline">
                    {trade.reason}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {trade.pnl !== null && (
                    <span className={`text-xs font-mono ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                  )}
                  {trade.umbra_signature && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/15 text-violet-400 rounded font-mono">
                      {trade.umbra_signature.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
