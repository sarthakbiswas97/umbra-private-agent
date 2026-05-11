"use client";

import { useState } from "react";
import { useUmbraData, API, postJSON } from "@/lib/api";

export default function TradingPage() {
  const data = useUmbraData();
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  async function submitDemoTrade() {
    setSubmitting(true);
    if (data.demo) {
      // Simulate a trade result in demo mode
      await new Promise((r) => setTimeout(r, 1500));
      const price = data.agent?.latest_price || 93.0;
      setLastResult({
        verdict: "APPROVED",
        risk_passed: true,
        trade: {
          direction: data.prediction?.prediction?.direction || "UP",
          price,
          confidence: data.prediction?.prediction?.confidence || 0.72,
          position_bps: 300,
          daily_pnl_bps: 89,
          drawdown_bps: 130,
          message_hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        },
        umbra: {
          success: true,
          queue_signature: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        },
        privacy: {
          program_id: "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ",
          network: "devnet",
          transfer_type: "confidential",
          amount_hidden: true,
        },
      });
    } else {
      const result = await postJSON(`${API}/trade/submit-demo`, {});
      setLastResult(result);
    }
    setSubmitting(false);
  }

  const prediction = data.prediction?.prediction;
  const executor = data.executor;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Confidential Trading</h1>
        <p className="text-xs text-gray-500 mt-1">
          AI prediction &rarr; Risk check &rarr; Umbra confidential transfer. Balances stay encrypted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Prediction */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">ML Prediction</h2>
          {prediction ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-3xl font-bold font-mono ${
                  prediction.direction === "UP" ? "text-emerald-400" : "text-red-400"
                }`}>
                  {prediction.direction}
                </span>
                <span className="text-lg text-gray-400 font-mono">
                  {(prediction.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                SHAP Explanation
              </h3>
              <div className="space-y-1">
                {Object.entries(prediction.shap_explanation || {}).map(([feat, info]: [string, any]) => (
                  <div key={feat} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{feat}</span>
                    <span className={info.direction?.includes("UP") ? "text-emerald-400" : "text-red-400"}>
                      {info.value > 0 ? "+" : ""}{info.value?.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-600 text-sm">?</span>
              </div>
              <p className="text-xs text-gray-500">No prediction yet</p>
              <p className="text-[10px] text-gray-600 mt-1">Predictions update every 5 seconds from the AI model</p>
            </div>
          )}
        </div>

        {/* Position */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Current Position</h2>
          {executor?.has_position && executor.position ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Side</span>
                <span className="text-white font-mono">{(executor.position as any).side}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Size</span>
                <span className="text-white font-mono">{(executor.position as any).size} SOL</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Entry</span>
                <span className="text-white font-mono">${(executor.position as any).entry_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">P&L</span>
                <span className={`font-mono ${(executor.position as any).unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ${(executor.position as any).unrealized_pnl?.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No open position</p>
          )}
        </div>
      </div>

      {/* Demo Trade Button */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Submit Confidential Trade</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Executes prediction &rarr; risk check &rarr; Umbra confidential transfer
            </p>
          </div>
          <button
            onClick={submitDemoTrade}
            disabled={submitting}
            className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Execute Trade"}
          </button>
        </div>

        {lastResult && (
          <div className="mt-4 pt-3 border-t border-gray-800 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold ${
                lastResult.verdict === "APPROVED" ? "text-emerald-400" : "text-red-400"
              }`}>
                {lastResult.verdict}
              </span>
              {lastResult.rejection_reason && (
                <span className="text-[10px] text-gray-500">
                  {lastResult.rejection_reason}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="text-gray-500">
                Direction: <span className="text-white">{lastResult.trade?.direction}</span>
              </div>
              <div className="text-gray-500">
                Price: <span className="text-white">${lastResult.trade?.price?.toFixed(2)}</span>
              </div>
              <div className="text-gray-500">
                Confidence: <span className="text-white">{(lastResult.trade?.confidence * 100)?.toFixed(0)}%</span>
              </div>
              <div className="text-gray-500">
                Privacy: <span className="text-violet-400">{lastResult.privacy?.transfer_type}</span>
              </div>
            </div>
            {lastResult.umbra?.success && (
              <div className="mt-2 text-[10px] text-violet-400">
                Umbra signature: {lastResult.umbra.queue_signature?.slice(0, 32)}...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      {executor?.recent_trades && executor.recent_trades.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Recent Trades</h2>
          <div className="space-y-2">
            {executor.recent_trades.slice().reverse().map((trade, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${
                    trade.action === "BUY" ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {trade.action}
                  </span>
                  <span className="text-xs text-gray-400">
                    {trade.amount.toFixed(4)} SOL @ ${trade.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {trade.pnl !== null && (
                    <span className={`text-xs font-mono ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                  )}
                  {trade.umbra_signature && (
                    <span className="text-[10px] text-violet-400">Private</span>
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
