"use client";

import { useState } from "react";

const MOCK_TRANSFERS = [
  { id: 1, type: "Deposit", amount: 2847.31, mint: "USDC", time: "2 min ago", sig: "4hExLDN83ZnYM7DP2s8u9AAqRLy8" },
  { id: 2, type: "Withdraw", amount: 1523.89, mint: "USDC", time: "8 min ago", sig: "2K1QbpNV7fxR3wwyaC5fCeWnWayd" },
  { id: 3, type: "Deposit", amount: 4210.00, mint: "USDC", time: "15 min ago", sig: "YWGSar27XDpjRv6cjk6PFHeALTMp" },
  { id: 4, type: "Deposit", amount: 892.44, mint: "USDC", time: "22 min ago", sig: "M5ZvpUMzSoWZZqLs6yBCCjG5RBs1" },
];

const MOCK_BALANCES = [
  { mint: "USDC", amount: 8472.31, encrypted: "0x7f3a...encrypted...b91c" },
  { mint: "wSOL", amount: 52.847, encrypted: "0x2e8d...encrypted...4a7f" },
];

function ViewToggle({ active, onToggle }: { active: string; onToggle: (v: string) => void }) {
  const tabs = ["Public", "Owner", "Auditor"];
  return (
    <div className="flex bg-gray-800 rounded-lg p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onToggle(tab)}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
            active === tab
              ? tab === "Public" ? "bg-red-600/30 text-red-300" :
                tab === "Owner" ? "bg-emerald-600/30 text-emerald-300" :
                "bg-indigo-600/30 text-indigo-300"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export default function PrivacyPage() {
  const [view, setView] = useState("Public");
  const [viewingKey, setViewingKey] = useState("");
  const [keyValid, setKeyValid] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const [demoMode, setDemoMode] = useState(false);

  async function handleKeySubmit() {
    if (viewingKey.length < 8) return;
    setDecrypting(true);
    try {
      const res = await fetch("http://localhost:8002/viewing-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "monthly", year: 2025, month: 1 }),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (data.viewingKey) {
        setViewingKey(data.viewingKey);
      }
      setKeyValid(true);
      setDemoMode(false);
    } catch {
      // Umbra service not running -- fall back to demo mode
      setKeyValid(true);
      setDemoMode(true);
    } finally {
      setDecrypting(false);
    }
  }

  const isRevealed = view === "Owner" || (view === "Auditor" && keyValid);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Privacy Demo</h1>
          <p className="text-xs text-gray-500 mt-1">
            Toggle between views to see what different parties can access
          </p>
        </div>
        <ViewToggle active={view} onToggle={setView} />
      </div>

      {/* View description */}
      <div className={`rounded-2xl border p-4 mb-6 ${
        view === "Public" ? "bg-red-500/5 border-red-500/20" :
        view === "Owner" ? "bg-emerald-500/5 border-emerald-500/20" :
        "bg-indigo-500/5 border-indigo-500/20"
      }`}>
        <p className={`text-xs font-medium ${
          view === "Public" ? "text-red-400" : view === "Owner" ? "text-emerald-400" : "text-indigo-400"
        }`}>
          {view === "Public" && "Public View -- What anyone sees on Solana Explorer. No amounts, no strategy, no P&L."}
          {view === "Owner" && "Owner View -- Full decrypted access via X25519 master key. See everything."}
          {view === "Auditor" && "Auditor View -- Time-scoped access via viewing key. Only sees data within the granted period."}
        </p>
      </div>

      {/* Viewing key input for Auditor */}
      {view === "Auditor" && !keyValid && (
        <>
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 mb-4">
          <p className="text-xs text-indigo-300">
            <strong>How viewing keys work:</strong> The fund manager derives a time-scoped key using Poseidon hashing.
            The auditor receives a monthly key that grants read-only access to balances and transfers for that period only.
            No access to the master key, no access to other months.
          </p>
        </div>
        <div className="bg-gray-900 border border-indigo-500/20 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-indigo-400 mb-2">Enter Viewing Key</h3>
          <p className="text-[10px] text-gray-500 mb-3">
            Paste the monthly viewing key shared by the fund manager to decrypt January 2025 activity.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={viewingKey}
              onChange={(e) => setViewingKey(e.target.value)}
              placeholder="Paste viewing key (e.g. vk_monthly_2025_01_a7b3c9...)"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <button
              onClick={handleKeySubmit}
              disabled={viewingKey.length < 8 || decrypting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {decrypting ? "Decrypting..." : "Decrypt"}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            Try any string 8+ characters. In production, this is a Poseidon-derived key from the fund manager.
          </p>
        </div>
        </>
      )}

      {view === "Auditor" && keyValid && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium">
                {demoMode ? "Demo mode -- start Umbra service for real key generation" : "Viewing key accepted -- showing January 2025 data"}
              </span>
            </div>
            <button onClick={() => { setKeyValid(false); setViewingKey(""); }} className="text-[10px] text-gray-500 hover:text-white">
              Revoke
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Balances */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Portfolio Balances</h2>
          <div className="space-y-3">
            {MOCK_BALANCES.map((b) => (
              <div key={b.mint} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{b.mint}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isRevealed ? "bg-emerald-500/15 text-emerald-400" : "bg-violet-500/15 text-violet-400"
                  }`}>
                    {isRevealed ? "Decrypted" : "Encrypted"}
                  </span>
                </div>
                {isRevealed ? (
                  <p className="text-2xl font-mono font-bold text-white animate-fade-in">
                    {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                ) : (
                  <div>
                    <p className="text-2xl font-mono font-bold text-gray-700">********</p>
                    <p className="text-[10px] font-mono text-gray-600 mt-1">{b.encrypted}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transfer History */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Transfers</h2>
          <div className="space-y-2">
            {MOCK_TRANSFERS.map((t) => (
              <div key={t.id} className="bg-gray-800/50 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    t.type === "Deposit" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                  }`}>{t.type}</span>
                  {isRevealed ? (
                    <span className="text-xs text-white font-mono animate-fade-in">
                      {t.amount.toLocaleString()} {t.mint}
                    </span>
                  ) : (
                    <span className="text-xs text-violet-400 font-mono">***** {t.mint}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">{t.time}</span>
                  <span className="text-[10px] text-violet-500 font-mono">{t.sig.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Viewing Key Hierarchy */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">How Viewing Keys Work</h2>
        <div className="flex items-center justify-center gap-0 py-4">
          {[
            { label: "Master Key", sub: "Full access", scope: "All time", color: "border-red-500/40 bg-red-500/10", text: "text-red-400" },
            { label: "Yearly Key", sub: "2025", scope: "1 year", color: "border-amber-500/40 bg-amber-500/10", text: "text-amber-400" },
            { label: "Monthly Key", sub: "Jan 2025", scope: "1 month", color: "border-emerald-500/40 bg-emerald-500/10", text: "text-emerald-400" },
            { label: "Daily Key", sub: "Jan 15", scope: "1 day", color: "border-indigo-500/40 bg-indigo-500/10", text: "text-indigo-400" },
          ].map((k, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && <div className="w-6 h-px bg-gray-700 mx-2" />}
              <div className={`border rounded-xl p-3 w-28 text-center ${k.color}`}>
                <p className={`text-[10px] font-semibold ${k.text}`}>{k.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{k.scope}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-2">
          Each level is derived via Poseidon hashing. Sharing a monthly key does NOT expose the yearly key or other months.
        </p>
      </div>

      {/* On-chain links */}
      <div className="text-center">
        <h3 className="text-xs font-semibold text-gray-500 mb-3">Verify On-Chain</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://explorer.solana.com/address/3XzQNmWuWBXTSisTv6xGomsxr38qM1De7nUdvzrxMqzS?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-violet-400 hover:text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20"
          >
            Decision Logs: 3XzQ...Mqzs
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
      </div>
    </main>
  );
}
