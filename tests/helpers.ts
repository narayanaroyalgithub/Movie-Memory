import { db } from "@/lib/db";
import type { FactGenerator } from "@/lib/facts/types";

export async function resetDb() {
  await db.fact.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
}

let counter = 0;
export function makeUser(favoriteMovie: string | null = "Inception") {
  counter += 1;
  return db.user.create({
    data: { email: `user${counter}-${Date.now()}@example.com`, name: `User ${counter}`, favoriteMovie },
  });
}

export class FakeClock {
  private t: number;
  constructor(start = Date.parse("2026-01-01T00:00:00.000Z")) {
    this.t = start;
  }
  now = () => new Date(this.t);
  advance(ms: number) {
    this.t += ms;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Generator that records calls and in-flight concurrency. */
export function fakeGenerator(opts: { delayMs?: number; fail?: boolean } = {}) {
  let calls = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  const generator: FactGenerator = {
    async generate(title) {
      calls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        if (opts.delayMs) await sleep(opts.delayMs);
        if (opts.fail) throw new Error("boom");
        return `Fact #${calls} about ${title}`;
      } finally {
        inFlight -= 1;
      }
    },
  };
  return { generator, calls: () => calls, maxInFlight: () => maxInFlight };
}
