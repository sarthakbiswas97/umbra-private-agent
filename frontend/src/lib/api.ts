"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { UmbraData } from "./types";
import { getMockData } from "./mock";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function postJSON<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useUmbraData(): UmbraData & { demo: boolean } {
  const [data, setData] = useState<UmbraData & { demo: boolean }>({
    agent: null,
    executor: null,
    prediction: null,
    balances: [],
    connected: false,
    demo: false,
  });
  const failCount = useRef(0);

  const poll = useCallback(async () => {
    const agent = await fetchJSON(`${API}/agent/status`);

    if (agent !== null) {
      failCount.current = 0;
      const [executor, prediction, balancesResp] = await Promise.all([
        fetchJSON(`${API}/trades/status`),
        fetchJSON(`${API}/predict/latest`),
        fetchJSON<{ balances: any[] }>(`${API}/umbra/balances`),
      ]);

      setData({
        agent: agent as UmbraData["agent"],
        executor: executor as UmbraData["executor"],
        prediction: prediction as UmbraData["prediction"],
        balances: (balancesResp as any)?.balances ?? [],
        connected: true,
        demo: false,
      });
    } else {
      failCount.current += 1;
      // Fall back to demo mode after 2 failed attempts
      if (failCount.current >= 2) {
        const mock = getMockData();
        setData({ ...mock, demo: true });
      }
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [poll]);

  return data;
}

export { API };
