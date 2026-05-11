"use client";

import Link from "next/link";

function Slide({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="w-full py-20 px-6 sm:px-12 lg:px-20 border-b border-gray-800 last:border-b-0"
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-400 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
      {children}
    </span>
  );
}

function DemoCard({
  title,
  stat,
  desc,
  href,
  color,
}: {
  title: string;
  stat: string;
  desc: string;
  href: string;
  color: "violet" | "emerald" | "indigo" | "amber";
}) {
  const border: Record<string, string> = {
    violet: "border-violet-500/30 hover:border-violet-500/60",
    emerald: "border-emerald-500/30 hover:border-emerald-500/60",
    indigo: "border-indigo-500/30 hover:border-indigo-500/60",
    amber: "border-amber-500/30 hover:border-amber-500/60",
  };
  const heading: Record<string, string> = {
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    amber: "text-amber-400",
  };

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bg-gray-900/60 border ${border[color]} rounded-xl p-6 transition-all hover:bg-gray-900/80`}
    >
      <h4 className={`text-sm font-semibold ${heading[color]}`}>{title}</h4>
      <p className="text-2xl font-bold text-white mt-2">{stat}</p>
      <p className="text-sm text-gray-400 mt-1">{desc}</p>
    </Link>
  );
}

export default function PresentationPage() {
  const BASE = "https://frontend-theta-five-61.vercel.app";

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Slide 1: Title ── */}
      <Slide id="title">
        <div className="text-center space-y-6">
          <Pill>Frontier Hackathon -- Umbra Track + 100xDevs Track</Pill>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white">
            Umbra Private Agent
          </h1>

          <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto">
            Confidential AI Trading on Solana
          </p>

          <p className="text-base text-gray-500">Built by Sarthak Biswas</p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <a
              href={BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              Live Demo
            </a>
            <a
              href="https://github.com/sarthakbiswas97/umbra-private-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium border border-gray-700 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </Slide>

      {/* ── Slide 2: The Problem ── */}
      <Slide id="problem">
        <h2 className="text-4xl font-bold text-white mb-10">
          Every trade on-chain is{" "}
          <span className="text-red-400">public</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <ul className="space-y-6 text-lg text-gray-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
              Competitors front-run your signals
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
              Investors panic-sell on unrealized losses
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 w-2 h-2 rounded-full bg-red-400 shrink-0" />
              Your strategy alpha decays because it is visible
            </li>
          </ul>

          {/* Mock Solana Explorer entry */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 font-mono text-sm space-y-3">
            <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">
              Solana Explorer -- Transaction Detail
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Instruction</span>
              <span className="text-white">Token Transfer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">From</span>
              <span className="text-violet-400">8xJn...4rKm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">To</span>
              <span className="text-violet-400">3XzQ...Mqzs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="text-red-400 font-bold">
                127.5 SOL{" "}
                <span className="text-xs text-red-400/60">VISIBLE</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance</span>
              <span className="text-red-400 font-bold">
                2,340.8 SOL{" "}
                <span className="text-xs text-red-400/60">VISIBLE</span>
              </span>
            </div>
          </div>
        </div>
      </Slide>

      {/* ── Slide 3: The Solution ── */}
      <Slide id="solution">
        <h2 className="text-4xl font-bold text-white mb-4">
          Umbra makes trading{" "}
          <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
            private
          </span>
        </h2>
        <p className="text-lg text-gray-400 mb-12">
          Three primitives from the Umbra SDK that change everything.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Encrypted Balances",
              desc: "Portfolio value hidden via encrypted token accounts. On-chain observers see ciphertext, not amounts.",
              accent: "violet",
            },
            {
              title: "Confidential Transfers",
              desc: "Trade amounts invisible on-chain. Swap SOL/USDC without revealing position size.",
              accent: "emerald",
            },
            {
              title: "Viewing Keys",
              desc: "Scoped auditor access via Poseidon-derived keys. Prove solvency without exposing strategy.",
              accent: "indigo",
            },
          ].map((col) => (
            <div
              key={col.title}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-6"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  col.accent === "violet"
                    ? "bg-violet-500/10 text-violet-400"
                    : col.accent === "emerald"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-indigo-500/10 text-indigo-400"
                }`}
              >
                {col.accent === "violet"
                  ? "\u229E"
                  : col.accent === "emerald"
                  ? "\u21C4"
                  : "\uD83D\uDD11"}
              </div>
              <h3
                className={`text-lg font-semibold mb-2 ${
                  col.accent === "violet"
                    ? "text-violet-400"
                    : col.accent === "emerald"
                    ? "text-emerald-400"
                    : "text-indigo-400"
                }`}
              >
                {col.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{col.desc}</p>
            </div>
          ))}
        </div>
      </Slide>

      {/* ── Slide 4: Architecture ── */}
      <Slide id="architecture">
        <h2 className="text-4xl font-bold text-white mb-12">
          Three-service architecture
        </h2>

        {/* Pipeline diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          {[
            { label: "Python Backend", sub: "ML + FastAPI", color: "bg-violet-500/20 border-violet-500/40 text-violet-300" },
            { label: "arrow", sub: "", color: "" },
            { label: "Umbra Service", sub: "@umbra-privacy/sdk", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
            { label: "arrow", sub: "", color: "" },
            { label: "Solana Devnet", sub: "Confidential Token 2022", color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" },
          ].map((node, i) =>
            node.label === "arrow" ? (
              <span key={i} className="text-gray-600 text-2xl hidden md:block">
                &rarr;
              </span>
            ) : (
              <div
                key={i}
                className={`${node.color} border rounded-xl px-6 py-4 text-center min-w-[180px]`}
              >
                <div className="font-semibold text-sm">{node.label}</div>
                <div className="text-xs opacity-70 mt-1">{node.sub}</div>
              </div>
            )
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            SDK functions used
          </h4>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "createMint()",
              "createTokenAccount()",
              "mintTo()",
              "transfer()",
              "getBalance()",
              "configureAccount()",
            ].map((fn) => (
              <code
                key={fn}
                className="text-sm font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2"
              >
                {fn}
              </code>
            ))}
          </div>
        </div>
      </Slide>

      {/* ── Slide 5: Live Demo Highlights ── */}
      <Slide id="demo">
        <h2 className="text-4xl font-bold text-white mb-4">See it yourself</h2>
        <p className="text-lg text-gray-400 mb-10">
          Four pages, each demonstrating a core capability.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <DemoCard
            title="Backtest"
            stat="54.3% win rate -- 1.47 Sharpe"
            desc="XGBoost model on historical SOL data with SHAP explainability"
            href={`${BASE}/backtest`}
            color="violet"
          />
          <DemoCard
            title="Simulation"
            stat="Live SOL price"
            desc="Animated ML pipeline: fetch, predict, encrypt, execute"
            href={`${BASE}/simulation`}
            color="emerald"
          />
          <DemoCard
            title="Privacy Demo"
            stat="3 viewing modes"
            desc="Toggle Public / Owner / Auditor to see what each role reveals"
            href={`${BASE}/privacy`}
            color="indigo"
          />
          <DemoCard
            title="Trading"
            stat="Confidential execution"
            desc="End-to-end private swap via Umbra SDK on devnet"
            href={`${BASE}/trading`}
            color="amber"
          />
        </div>
      </Slide>

      {/* ── Slide 6: Why It Matters ── */}
      <Slide id="impact">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white">
            <span className="text-red-400">$1B+</span> extracted annually by
            front-runners
          </h2>

          <p className="text-2xl text-gray-300 font-medium">
            This agent makes it impossible.
          </p>

          <div className="inline-block bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 font-mono text-sm text-gray-400">
            Deployed on Solana Devnet &mdash; program:{" "}
            <span className="text-violet-400">3XzQ...Mqzs</span>
          </div>

          <div className="pt-4">
            <a
              href={BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors text-lg"
            >
              Try it now &rarr;
            </a>
          </div>

          <p className="text-sm text-gray-600 pt-6">
            {BASE}
          </p>
        </div>
      </Slide>
    </main>
  );
}
