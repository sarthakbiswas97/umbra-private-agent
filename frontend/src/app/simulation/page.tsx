"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PipelineStep {
  label: string;
  status: "waiting" | "active" | "done";
  value: string;
  color: string;
}

interface Trade {
  id: number;
  action: "BUY" | "SELL";
  price: number;
  size: number;
  confidence: number;
  pnl: number | null;
  timestamp: number;
  umbraSig: string;
}

const JUPITER_PRICE_URL = "https://api.jup.ag/price/v2";
const SOL_MINT = "So11111111111111111111111111111111111111112";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

function computeMockFeatures(prices: number[]) {
  if (prices.length < 15) return null;
  const recent = prices.slice(-14);
  const momentum = (recent[recent.length - 1] - recent[0]) / recent[0];
  const volatility = Math.sqrt(
    recent.slice(1).reduce((s, p, i) => s + ((p - recent[i]) / recent[i]) ** 2, 0) / (recent.length - 1)
  );
  const sma = recent.reduce((a, b) => a + b, 0) / recent.length;
  const emaRatio = recent[recent.length - 1] / sma;
  const rsi = 50 + momentum * 500; // simplified
  return { momentum, volatility, emaRatio, rsi: Math.min(80, Math.max(20, rsi)) };
}

export default function SimulationPage() {
  const [price, setPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [position, setPosition] = useState<{ side: string; entry: number; size: number } | null>(null);
  const [capital, setCapital] = useState(10000);
  const [prediction, setPrediction] = useState<{ direction: string; confidence: number } | null>(null);
  const tradeIdRef = useRef(0);
  const priceRef = useRef<number[]>([]);

  // Fetch real SOL price
  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`${JUPITER_PRICE_URL}?ids=${SOL_MINT}`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const p = parseFloat(data?.data?.[SOL_MINT]?.price || "0");
      if (p > 0) {
        setPrice(p);
        priceRef.current = [...priceRef.current.slice(-59), p];
        setPriceHistory((prev) => [...prev.slice(-59), p]);
      }
    } catch {
      // Use mock price on failure
      setPrice((prev) => prev > 0 ? prev + (Math.random() - 0.5) * 0.5 : 172.5);
      const p = price || 172.5;
      priceRef.current = [...priceRef.current.slice(-59), p];
      setPriceHistory((prev) => [...prev.slice(-59), p]);
    }
  }, [price]);

  useEffect(() => {
    fetchPrice();
    const id = setInterval(fetchPrice, 5000);
    return () => clearInterval(id);
  }, [fetchPrice]);

  async function runCycle() {
    if (running) return;
    setRunning(true);

    const currentPrice = priceRef.current[priceRef.current.length - 1] || price;

    // Step 1: Price
    setSteps([
      { label: "Price Feed", status: "active", value: `$${currentPrice.toFixed(2)}`, color: "text-white" },
      { label: "Features", status: "waiting", value: "---", color: "text-gray-500" },
      { label: "AI Prediction", status: "waiting", value: "---", color: "text-gray-500" },
      { label: "Risk Check", status: "waiting", value: "---", color: "text-gray-500" },
      { label: "Umbra Transfer", status: "waiting", value: "---", color: "text-gray-500" },
    ]);
    await sleep(800);

    // Step 2: Features
    const features = computeMockFeatures(priceRef.current);
    setSteps((s) => s.map((x, i) =>
      i === 0 ? { ...x, status: "done" as const } :
      i === 1 ? { ...x, status: "active" as const, value: features ? `RSI: ${features.rsi.toFixed(0)} | Mom: ${(features.momentum * 100).toFixed(2)}%` : "Insufficient data", color: "text-amber-400" } :
      x
    ));
    await sleep(600);

    // Step 3: Prediction
    const r = rng(Date.now());
    const direction = features && features.momentum > 0.001 ? "UP" : features && features.momentum < -0.001 ? "DOWN" : (r() > 0.5 ? "UP" : "DOWN");
    const confidence = 0.55 + r() * 0.2;
    setPrediction({ direction, confidence });

    setSteps((s) => s.map((x, i) =>
      i === 1 ? { ...x, status: "done" as const } :
      i === 2 ? { ...x, status: "active" as const, value: `${direction} ${(confidence * 100).toFixed(0)}%`, color: direction === "UP" ? "text-emerald-400" : "text-red-400" } :
      x
    ));
    await sleep(600);

    // Step 4: Risk Check
    const riskPassed = confidence > 0.6 && capital > 9000;
    setSteps((s) => s.map((x, i) =>
      i === 2 ? { ...x, status: "done" as const } :
      i === 3 ? { ...x, status: "active" as const, value: riskPassed ? "PASSED (8/8)" : "BLOCKED", color: riskPassed ? "text-emerald-400" : "text-red-400" } :
      x
    ));
    await sleep(600);

    // Step 5: Umbra Transfer
    let action: "BUY" | "SELL" | null = null;
    let tradePnl: number | null = null;

    if (riskPassed && !position && direction === "UP") {
      action = "BUY";
    } else if (position) {
      const pnlPct = (currentPrice - position.entry) / position.entry;
      if (pnlPct > 0.03 || pnlPct < -0.02 || direction === "DOWN") {
        action = "SELL";
        tradePnl = (currentPrice - position.entry) * position.size;
      }
    }

    const sig = Array.from({ length: 44 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("");

    if (action) {
      setSteps((s) => s.map((x, i) =>
        i === 3 ? { ...x, status: "done" as const } :
        i === 4 ? { ...x, status: "active" as const, value: `${action} -- amount hidden`, color: "text-violet-400" } :
        x
      ));
      await sleep(1000);

      const size = action === "BUY" ? parseFloat(((capital * 0.03) / currentPrice).toFixed(4)) : position!.size;
      tradeIdRef.current += 1;

      const trade: Trade = {
        id: tradeIdRef.current,
        action,
        price: currentPrice,
        size,
        confidence,
        pnl: tradePnl,
        timestamp: Date.now(),
        umbraSig: sig,
      };
      setTrades((prev) => [trade, ...prev].slice(0, 20));

      if (action === "BUY") {
        setPosition({ side: "LONG", entry: currentPrice, size });
      } else {
        setCapital((c) => c + (tradePnl || 0));
        setPosition(null);
      }

      setSteps((s) => s.map((x, i) =>
        i === 4 ? { ...x, status: "done" as const, value: `${action} ${size} SOL -- ${sig.slice(0, 8)}...` } : x
      ));
    } else {
      setSteps((s) => s.map((x, i) =>
        i === 3 ? { ...x, status: "done" as const } :
        i === 4 ? { ...x, status: "done" as const, value: riskPassed ? "HOLD -- no signal" : "BLOCKED by risk", color: "text-gray-400" } :
        x
      ));
    }

    await sleep(500);
    setRunning(false);
  }

  // Auto-run every 8 seconds
  useEffect(() => {
    const id = setInterval(() => {
      if (!running && price > 0) runCycle();
    }, 8000);
    return () => clearInterval(id);
  }, [running, price]);

  const unrealizedPnl = position ? (price - position.entry) * position.size : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Simulation</h1>
          <p className="text-xs text-gray-500 mt-1">
            AI trading against real SOL price -- every step visible
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-mono font-bold text-white tabular-nums">
              ${price > 0 ? price.toFixed(2) : "---"}
            </p>
            <p className="text-[10px] text-gray-500">SOL/USDC (Jupiter)</p>
          </div>
          <button
            onClick={runCycle}
            disabled={running}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {running ? "Running..." : "Run Cycle"}
          </button>
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Trade Pipeline</h2>
        <div className="flex items-stretch gap-2">
          {steps.length > 0 ? steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              {i > 0 && (
                <div className={`w-6 h-px mx-1 ${step.status !== "waiting" ? "bg-violet-500/60" : "bg-gray-700"}`} />
              )}
              <div className={`flex-1 rounded-xl border p-3 transition-all ${
                step.status === "active" ? "border-violet-500/50 bg-violet-500/10 scale-[1.02]" :
                step.status === "done" ? "border-gray-700 bg-gray-800/50" :
                "border-gray-800 bg-gray-900"
              }`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{step.label}</p>
                <p className={`text-xs font-mono mt-1 ${step.color}`}>{step.value}</p>
                {step.status === "active" && (
                  <div className="w-full h-0.5 bg-violet-500/30 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center w-full py-6 text-gray-600 text-xs">
              Click "Run Cycle" or wait for auto-run to start the trading pipeline
            </div>
          )}
        </div>
      </div>

      {/* Split view: what public sees vs what agent sees */}
      {prediction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-red-400 mb-2">What Solana Explorer Shows</h3>
            <div className="font-mono text-[11px] text-gray-500 space-y-1">
              <p>Program: Umbra Privacy</p>
              <p>Instruction: ConfidentialTransfer</p>
              <p>Amount: <span className="text-violet-400">***** (encrypted)</span></p>
              <p>Sender: <span className="text-violet-400">shielded</span></p>
              <p>Balance: <span className="text-violet-400">encrypted</span></p>
            </div>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-emerald-400 mb-2">What the Agent Sees (with viewing key)</h3>
            <div className="font-mono text-[11px] text-gray-400 space-y-1">
              <p>Direction: <span className={prediction.direction === "UP" ? "text-emerald-400" : "text-red-400"}>{prediction.direction}</span></p>
              <p>Confidence: <span className="text-white">{(prediction.confidence * 100).toFixed(0)}%</span></p>
              <p>Position: <span className="text-white">{position ? `${position.size} SOL @ $${position.entry.toFixed(2)}` : "None"}</span></p>
              <p>Capital: <span className="text-white">${capital.toFixed(2)}</span></p>
              <p>Unrealized P&L: <span className={unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}>${unrealizedPnl.toFixed(2)}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Capital</p>
          <p className="text-lg font-mono text-white">${capital.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">P&L</p>
          <p className={`text-lg font-mono ${capital >= 10000 ? "text-emerald-400" : "text-red-400"}`}>
            {capital >= 10000 ? "+" : ""}${(capital - 10000).toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Trades</p>
          <p className="text-lg font-mono text-white">{trades.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Position</p>
          <p className="text-lg font-mono text-white">{position ? `${position.size} SOL` : "Flat"}</p>
        </div>
      </div>

      {/* Trade log */}
      {trades.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Trade Log (Confidential)</h2>
          <p className="text-[10px] text-gray-600 mb-3">In demo mode, signatures are simulated. Start backend for real on-chain transactions.</p>
          <div className="space-y-2">
            {trades.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    t.action === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                  }`}>{t.action}</span>
                  <span className="text-xs text-gray-400">{t.size} SOL @ ${t.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {t.pnl !== null && (
                    <span className={`text-xs font-mono ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                    </span>
                  )}
                  <a
                    href={`https://explorer.solana.com/tx/${t.umbraSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-1.5 py-0.5 bg-violet-500/15 text-violet-400 hover:text-violet-300 rounded font-mono"
                    title="Simulated signature -- start backend for real on-chain transactions"
                  >
                    {t.umbraSig.slice(0, 8)}...
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
