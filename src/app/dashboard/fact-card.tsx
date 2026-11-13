"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type FactSource = "cache" | "generated" | "stale-fallback";

interface FactPayload {
  fact: { id: string; movieTitle: string; content: string; createdAt: string };
  source: FactSource;
  nextRefreshInMs: number;
}

const SOURCE_NOTE: Record<FactSource, string> = {
  generated: "Just generated",
  cache: "Saved from a moment ago",
  "stale-fallback": "We couldn’t reach the fact generator, so this is an earlier fact.",
};

export function FactCard() {
  const [data, setData] = useState<FactPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshAt, setRefreshAt] = useState(0);
  const [now, setNow] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fact", { cache: "no-store", signal: controller.signal });
      if (res.status === 401) {
        window.location.assign("/");
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "We couldn’t load a fun fact. Please try again.");
        return;
      }
      const payload = body as FactPayload;
      const t = Date.now();
      setData(payload);
      setNow(t);
      // The server sends a relative delay, so this doesn't depend on clock sync.
      setRefreshAt(t + payload.nextRefreshInMs);
    } catch (e) {
      if (controller.signal.aborted) return; // superseded or unmounted
      setError("Network problem. Check your connection and try again.");
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const waiting = refreshAt > now;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waiting]);

  const secondsLeft = Math.max(0, Math.ceil((refreshAt - now) / 1000));

  return (
    <section aria-labelledby="fact-heading" aria-busy={loading} className="mt-12">
      <div className="ticket p-6 md:p-8 [--stub-y:78%]">
        <h2 id="fact-heading" className="text-sm font-medium text-ink-soft">Fun fact</h2>

        <div className="mt-3 min-h-[5.5rem]" aria-live="polite">
          {loading && !data ? (
            <div role="status" className="space-y-2.5 pt-1">
              <span className="sr-only">Loading a fun fact</span>
              <div className="h-3 w-full animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-ink/10" />
            </div>
          ) : data ? (
            <p className="font-display text-xl leading-relaxed md:text-2xl">{data.fact.content}</p>
          ) : null}

          {error && (
            <p role="alert" className="mt-2 text-alert">{error}</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-5">
          <p className="text-sm text-ink-soft">
            {data ? SOURCE_NOTE[data.source] : error ? "Nothing to show yet." : "Picking a fact…"}
          </p>
          <Button variant="ghost" onClick={() => void load()} disabled={loading || waiting}>
            {loading ? "Working…" : waiting ? `New fact in ${secondsLeft}s` : data ? "Get a new fact" : "Try again"}
          </Button>
        </div>
      </div>
    </section>
  );
}
