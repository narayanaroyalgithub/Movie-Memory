export interface FactGenerator {
  /** Resolve with the fact text, or reject. Must honour `signal` where possible. */
  generate(movieTitle: string, opts: { signal: AbortSignal }): Promise<string>;
}

export type FactSource = "cache" | "generated" | "stale-fallback";

export interface FactDTO {
  id: string;
  movieTitle: string;
  content: string;
  createdAt: Date;
}

export interface FactResult {
  fact: FactDTO;
  source: FactSource;
  /** Milliseconds until a brand-new fact can be generated (0 = now). Relative, so clients don't depend on clock sync. */
  nextRefreshInMs: number;
}
