"use client";

import { useState, useEffect, useCallback } from "react";
import type { UmbraData } from "./types";

const API = "http://localhost:8001";

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
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

export function useUmbraData(): UmbraData {
  const [data, setData] = useState<UmbraData>({
    agent: null,
    executor: null,
    prediction: null,
    balances: [],
    connected: false,
  });

  const poll = useCallback(async () => {
    const [agent, executor, prediction, balancesResp] = await Promise.all([
      fetchJSON(`${API}/agent/status`),
      fetchJSON(`${API}/trades/status`),
      fetchJSON(`${API}/predict/latest`),
      fetchJSON<{ balances: any[] }>(`${API}/umbra/balances`),
    ]);

    setData({
      agent: agent as UmbraData["agent"],
      executor: executor as UmbraData["executor"],
      prediction: prediction as UmbraData["prediction"],
      balances: (balancesResp as any)?.balances ?? [],
      connected: agent !== null,
    });
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [poll]);

  return data;
}

export { API };
