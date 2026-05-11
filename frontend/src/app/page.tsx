"use client";

import Link from "next/link";

function Card({
  href, title, desc, color, icon,
}: {
  href: string; title: string; desc: string; color: string; icon: string;
}) {
  const ring: Record<string, string> = {
    amber: "ring-amber-500/30 hover:ring-amber-500/60",
    violet: "ring-violet-500/30 hover:ring-violet-500/60",
    indigo: "ring-indigo-500/30 hover:ring-indigo-500/60",
    emerald: "ring-emerald-500/30 hover:ring-emerald-500/60",
  };
  const text: Record<string, string> = {
    amber: "text-amber-400", violet: "text-violet-400",
    indigo: "text-indigo-400", emerald: "text-emerald-400",
  };

  return (
    <Link
      href={href}
      className={`bg-gray-900 border border-gray-800 rounded-2xl p-6 ring-1 ${ring[color]} transition-all hover:bg-gray-900/80 group`}
    >
      <span className="text-2xl">{icon}</span>
      <h3 className={`text-base font-semibold mt-3 ${text[color]}`}>{title}</h3>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
      <span className="text-[10px] text-gray-600 mt-3 inline-block group-hover:text-gray-400 transition-colors">
        Explore &rarr;
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[11px] text-violet-400 font-medium mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Deployed on Solana Devnet
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
          Your AI trades.<br />
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Nobody sees.
          </span>
        </h1>
        <p className="text-gray-400 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
          An autonomous AI portfolio manager that executes SOL/USDC trades
          with on-chain privacy. Trade amounts are hidden via Umbra confidential
          transfers. Investors audit via viewing keys -- not public explorers.
        </p>
      </div>

      {/* Problem / Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-red-400 mb-3">The Problem</h2>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">x</span>
              <span>AI fund trades on-chain -- <span className="text-white">everyone sees what it buys</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">x</span>
              <span>Competitors <span className="text-white">front-run every trade</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">x</span>
              <span>Investors see unrealized losses and <span className="text-white">panic sell</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">x</span>
              <span>Alpha decays because <span className="text-white">strategy is public</span></span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-950 rounded-lg font-mono text-[10px] text-gray-500">
            <p className="text-red-400">Solana Explorer:</p>
            <p>Transfer: <span className="text-white">2,847.31 USDC</span> to DeFi Pool</p>
            <p>From: <span className="text-white">Av6h...FgYqo</span></p>
            <p>Amount: <span className="text-white">VISIBLE TO EVERYONE</span></p>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-emerald-400 mb-3">The Solution: Umbra</h2>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>Trade amounts are <span className="text-white">encrypted on-chain</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>Portfolio balance <span className="text-white">hidden from public</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>Investors get <span className="text-white">viewing keys</span> to audit privately</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>Risk limits enforced <span className="text-white">before</span> confidential transfers</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-950 rounded-lg font-mono text-[10px] text-gray-500">
            <p className="text-emerald-400">Solana Explorer:</p>
            <p>Transfer: <span className="text-violet-400">***** USDC</span> (confidential)</p>
            <p>From: <span className="text-violet-400">Shielded</span></p>
            <p>Amount: <span className="text-violet-400">HIDDEN VIA UMBRA MPC</span></p>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
        <Card
          href="/backtest"
          icon="&#x1F4C8;"
          title="Backtest Results"
          desc="XGBoost model tested on 129k candles. Equity curve, win rate, Sharpe ratio."
          color="amber"
        />
        <Card
          href="/simulation"
          icon="&#x26A1;"
          title="Live Simulation"
          desc="Watch the AI trade against real SOL price. Every step visible: predict, risk check, private transfer."
          color="violet"
        />
        <Card
          href="/privacy"
          icon="&#x1F510;"
          title="Privacy Demo"
          desc="See what the public sees vs what the owner sees. Try decrypting balances with a viewing key."
          color="indigo"
        />
      </div>

      {/* Architecture */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-16">
        <h2 className="text-sm font-semibold text-white mb-4">How It Works</h2>
        <div className="flex items-center justify-center gap-0 overflow-x-auto py-2 text-center">
          {[
            { label: "Market Data", sub: "Jupiter / Birdeye", color: "text-gray-400" },
            { label: "XGBoost AI", sub: "14 features + SHAP", color: "text-amber-400" },
            { label: "Risk Check", sub: "8-point validation", color: "text-emerald-400" },
            { label: "Umbra Transfer", sub: "Amount hidden", color: "text-violet-400" },
            { label: "Settlement", sub: "On Solana", color: "text-indigo-400" },
          ].map((step, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <div className="w-8 h-px bg-gray-700 mx-1 hidden sm:block" />
              )}
              <div className="flex flex-col items-center w-28 shrink-0">
                <span className={`text-xs font-semibold ${step.color}`}>{step.label}</span>
                <span className="text-[10px] text-gray-600 mt-0.5">{step.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* On-chain proof */}
      <div className="text-center">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">On-Chain Programs</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://explorer.solana.com/address/3XzQNmWuWBXTSisTv6xGomsxr38qM1De7nUdvzrxMqzS?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-violet-400 hover:text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20"
          >
            Umbra Logs: 3XzQ...Mqzs
          </a>
          <a
            href="https://explorer.solana.com/address/DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
          >
            Umbra Privacy: DSuK...pAJ
          </a>
        </div>
        <p className="text-[10px] text-gray-600 mt-4">
          Built with XGBoost + Umbra SDK + Anchor + Next.js
        </p>
      </div>
    </main>
  );
}
