import { Prisma, type Fact, type PrismaClient } from "@prisma/client";
import { CACHE_TTL_MS, GENERATION_TIMEOUT_MS, TX_MAX_WAIT_MS, TX_TIMEOUT_MS } from "./constants";
import { FactUnavailableError } from "./errors";
import type { FactGenerator, FactResult, FactSource } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

export interface FactServiceDeps {
  db: PrismaClient;
  generator: FactGenerator;
  /** Injectable clock so the 60s window is testable without sleeping. */
  now?: () => Date;
  ttlMs?: number;
  generationTimeoutMs?: number;
}

/**
 * Fact service: 60-second rolling cache, per-(user, movie) serialisation and
 * graceful degradation. Dependencies are injected so tests can drive it with a
 * fake clock and a fake generator against a real Postgres.
 */
export function createFactService({
  db,
  generator,
  now = () => new Date(),
  ttlMs = CACHE_TTL_MS,
  generationTimeoutMs = GENERATION_TIMEOUT_MS,
}: FactServiceDeps) {
  const ageMs = (fact: Fact) => now().getTime() - fact.createdAt.getTime();
  // Strictly "less than 60 seconds old". A fact exactly at the TTL is expired.
  const isFresh = (fact: Fact) => ageMs(fact) < ttlMs;

  const findLatest = (client: Db, userId: string, movieTitle: string) =>
    client.fact.findFirst({
      where: { userId, movieTitle },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

  const toResult = (fact: Fact, source: FactSource): FactResult => ({
    fact: { id: fact.id, movieTitle: fact.movieTitle, content: fact.content, createdAt: fact.createdAt },
    source,
    nextRefreshInMs: source === "stale-fallback" ? 0 : Math.max(0, ttlMs - ageMs(fact)),
  });

  async function generateWithTimeout(movieTitle: string): Promise<string> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Fact generation timed out after ${generationTimeoutMs}ms`));
      }, generationTimeoutMs);
    });
    try {
      const text = await Promise.race([generator.generate(movieTitle, { signal: controller.signal }), timeout]);
      const content = text.trim();
      if (!content) throw new Error("Generator returned an empty fact");
      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Returns a fact for (userId, movieTitle).
   *
   * `userId` must come from the authenticated session and nowhere else; the
   * function has no way to read another user's rows because every query is
   * scoped by it.
   */
  async function getOrCreateFact(userId: string, movieTitle: string): Promise<FactResult> {
    // 1. Fast path: no transaction, no lock, no OpenAI.
    const cached = await findLatest(db, userId, movieTitle);
    if (cached && isFresh(cached)) return toResult(cached, "cache");

    try {
      return await db.$transaction(
        async (tx) => {
          // 2. Serialise per (user, movie). The lock is released automatically at COMMIT/ROLLBACK,
          //    so a crashed instance can never leave it held. hashtextextended gives a 64-bit key.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`fact:${userId}:${movieTitle}`}, 0))`;

          // 3. Double-check: whoever held the lock before us may have just created a fact.
          //    This re-read must see their committed row, hence READ COMMITTED (see isolationLevel).
          const latest = await findLatest(tx, userId, movieTitle);
          if (latest && isFresh(latest)) return toResult(latest, "cache");

          // 4. We are the single generator for this window.
          let content: string;
          try {
            content = await generateWithTimeout(movieTitle);
          } catch (cause) {
            console.error("[facts] generation failed", { userId, cause: cause instanceof Error ? cause.message : cause });
            if (latest) return toResult(latest, "stale-fallback");
            throw new FactUnavailableError("OpenAI failed and no cached fact exists", { cause });
          }

          const fact = await tx.fact.create({ data: { userId, movieTitle, content, createdAt: now() } });
          return toResult(fact, "generated");
        },
        {
          maxWait: TX_MAX_WAIT_MS,
          timeout: TX_TIMEOUT_MS,
          // Under REPEATABLE READ the snapshot is taken before we acquire the lock,
          // which would defeat the double-check. READ COMMITTED re-reads after the wait.
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
    } catch (error) {
      if (error instanceof FactUnavailableError) throw error;
      // Infrastructure failure (pool timeout, lock wait exceeded, DB hiccup): degrade, don't 500.
      console.error("[facts] transaction failed", error);
      if (cached) return toResult(cached, "stale-fallback");
      throw new FactUnavailableError("Fact transaction failed", { cause: error });
    }
  }

  return { getOrCreateFact };
}

export type FactService = ReturnType<typeof createFactService>;
