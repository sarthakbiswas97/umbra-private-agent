"use client";

import { useState } from "react";
import type { EncryptedBalance } from "@/lib/types";
import { API, postJSON } from "@/lib/api";

const MINT_NAMES: Record<string, string> = {
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "So11111111111111111111111111111111111111112": "wSOL",
};

function BalanceCard({ balance }: { balance: EncryptedBalance }) {
  const [revealed, setRevealed] = useState(false);
  const name = MINT_NAMES[balance.mint] || balance.mint.slice(0, 8) + "...";
  const hasBalance = balance.state === "shared" && balance.balance !== null;
  const isEncrypted = balance.state === "mxe";

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
            <span className="text-violet-400 text-sm font-bold">{name[0]}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-[10px] text-gray-500 font-mono">{balance.mint.slice(0, 16)}...</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          balance.state === "shared"
            ? "bg-emerald-500/15 text-emerald-400"
            : balance.state === "mxe"
              ? "bg-violet-500/15 text-violet-400"
              : "bg-gray-700 text-gray-400"
        }`}>
          {balance.state === "shared" ? "Decryptable" : balance.state === "mxe" ? "MXE Only" : balance.state}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {hasBalance && revealed ? (
            <p className="text-2xl font-mono font-bold text-white animate-fade-in">
              {balance.balance!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </p>
          ) : hasBalance ? (
            <p className="text-2xl font-mono font-bold text-gray-600">
              ********
            </p>
          ) : isEncrypted ? (
            <p className="text-lg text-gray-500 italic">Encrypted (MXE)</p>
          ) : (
            <p className="text-lg text-gray-600">No balance</p>
          )}
        </div>

        {hasBalance && (
          <button
            onClick={() => setRevealed(!revealed)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              revealed
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-violet-600 text-white hover:bg-violet-500"
            }`}
          >
            {revealed ? "Hide" : "Decrypt"}
          </button>
        )}
      </div>

      {hasBalance && revealed && (
        <p className="text-[10px] text-gray-500">
          Decrypted via viewing key (X25519 shared mode)
        </p>
      )}
    </div>
  );
}

export default function EncryptedBalances({
  balances,
}: {
  balances: EncryptedBalance[];
}) {
  const [depositing, setDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  async function handleDeposit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setDepositing(true);
    await postJSON(`${API}/umbra/deposit`, {
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: parseFloat(depositAmount),
    });
    setDepositAmount("");
    setDepositing(false);
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Encrypted Portfolio</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Balances stored on-chain via Umbra -- only viewable with your key
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={handleDeposit}
            disabled={depositing}
            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors"
          >
            {depositing ? "..." : "Deposit"}
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {balances.length > 0 ? (
          balances.map((b) => <BalanceCard key={b.mint} balance={b} />)
        ) : (
          <div className="text-center py-8 text-gray-600 text-sm">
            No encrypted balances found. Deposit tokens to get started.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span>Program: DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ (Umbra Devnet)</span>
        </div>
      </div>
    </div>
  );
}
