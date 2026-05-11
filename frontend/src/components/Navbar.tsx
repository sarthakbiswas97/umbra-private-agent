"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/backtest", label: "Backtest" },
  { href: "/simulation", label: "Live Sim" },
  { href: "/privacy", label: "Privacy Demo" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              Umbra Private Agent
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? "bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <a
            href="https://explorer.solana.com/address/3XzQNmWuWBXTSisTv6xGomsxr38qM1De7nUdvzrxMqzS?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-violet-400 transition-colors"
          >
            <span className="font-mono hidden sm:inline">Devnet</span>
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          </a>
        </div>
      </div>
    </nav>
  );
}
