import type { UmbraStatus } from "@/lib/types";

export default function UmbraCard({ umbra }: { umbra: UmbraStatus | undefined }) {
  if (!umbra) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-white mb-2">Umbra Privacy Layer</h2>
        <p className="text-xs text-gray-500">Connecting to Umbra service...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Umbra Privacy Layer</h2>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          umbra.enabled
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-red-500/15 text-red-400"
        }`}>
          {umbra.enabled ? "Connected" : "Offline"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Network</p>
          <p className="text-sm font-mono text-white mt-1">{umbra.network}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Registration</p>
          <p className="text-sm font-mono text-white mt-1">
            {umbra.registered ? "Registered" : "Pending"}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 col-span-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Program ID</p>
          <p className="text-xs font-mono text-violet-400 mt-1 break-all">
            {umbra.program_id}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Privacy Capabilities</h3>
        <div className="flex flex-wrap gap-2">
          {["Encrypted Balances", "Confidential Transfers", "Viewing Keys", "UTXO Mixer"].map((cap) => (
            <span key={cap} className="text-[10px] px-2 py-1 bg-violet-500/10 text-violet-400 rounded-md border border-violet-500/20">
              {cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
