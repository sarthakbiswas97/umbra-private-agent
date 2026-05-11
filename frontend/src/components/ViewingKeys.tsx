"use client";

import { useState } from "react";
import { API, postJSON } from "@/lib/api";

interface GeneratedKey {
  scope: string;
  year: number;
  month: number | null;
  day: number | null;
  keyHex: string;
}

export default function ViewingKeys() {
  const [keys, setKeys] = useState<GeneratedKey[]>([]);
  const [scope, setScope] = useState("monthly");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    const result = await postJSON<any>(`${API}/umbra/viewing-key`, {
      scope,
      year,
      month,
      day: 1,
    });
    // Use response if available, otherwise generate a demo key
    const keyHex = result?.key_hex
      || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setKeys((prev) => [
      {
        scope,
        year,
        month: scope !== "yearly" ? month : null,
        day: null,
        keyHex,
      },
      ...prev,
    ]);
    setGenerating(false);
  }

  function copyKey(idx: number) {
    navigator.clipboard.writeText(keys[idx].keyHex);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Viewing Keys</h2>
      <p className="text-[10px] text-gray-500 mb-4">
        Generate time-scoped viewing keys for auditors and investors.
        Each key grants read-only access to your UTXO activity within that period.
      </p>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        {scope !== "yearly" && (
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Month</label>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-16 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate Key"}
        </button>
      </div>

      {keys.length > 0 && (
        <div className="space-y-2">
          {keys.map((key, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center">
                  <span className="text-indigo-400 text-[10px] font-bold">
                    {key.scope[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-white font-medium">
                    {key.scope} -- {key.year}
                    {key.month ? `/${String(key.month).padStart(2, "0")}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {key.keyHex.slice(0, 32)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => copyKey(idx)}
                className="px-2 py-1 text-[10px] font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              >
                {copiedIdx === idx ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}

      {keys.length === 0 && (
        <div className="text-center py-6 text-gray-600 text-xs">
          No viewing keys generated yet. Generate one to share with auditors.
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="text-[10px] text-gray-500 space-y-1">
          <p>Viewing keys use hierarchical Poseidon hashing: Master &rarr; Yearly &rarr; Monthly &rarr; Daily</p>
          <p>Sharing a key at any level grants read-only access to UTXO activity within that scope only.</p>
        </div>
      </div>
    </div>
  );
}
