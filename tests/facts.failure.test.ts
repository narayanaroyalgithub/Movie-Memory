import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { FactUnavailableError } from "@/lib/facts/errors";
import { createFactService } from "@/lib/facts/service";
import type { FactGenerator } from "@/lib/facts/types";
import { FakeClock, fakeGenerator, makeUser, resetDb } from "./helpers";

describe("OpenAI failure handling", () => {
  beforeEach(async () => {
    await resetDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("throws a user-friendly error when OpenAI fails and nothing is cached", async () => {
    const user = await makeUser();
    const service = createFactService({ db, generator: fakeGenerator({ fail: true }).generator });

    const error = await service.getOrCreateFact(user.id, "Inception").catch((e) => e);

    expect(error).toBeInstanceOf(FactUnavailableError);
    expect(error.userMessage).toMatch(/try again/i);
    expect(await db.fact.count()).toBe(0);
  });

  it("falls back to the most recent fact when OpenAI fails after the cache expired", async () => {
    const user = await makeUser();
    const clock = new FakeClock();
    const good = createFactService({ db, generator: fakeGenerator().generator, now: clock.now });
    const original = await good.getOrCreateFact(user.id, "Inception");

    clock.advance(61_000);
    const bad = createFactService({ db, generator: fakeGenerator({ fail: true }).generator, now: clock.now });
    const result = await bad.getOrCreateFact(user.id, "Inception");

    expect(result.source).toBe("stale-fallback");
    expect(result.fact.id).toBe(original.fact.id);
    expect(await db.fact.count()).toBe(1);
  });

  it("treats a hung generator as a failure via the service-level timeout", async () => {
    const user = await makeUser();
    const hung: FactGenerator = { generate: () => new Promise(() => {}) }; // never settles, ignores the signal
    const service = createFactService({ db, generator: hung, generationTimeoutMs: 50 });

    await expect(service.getOrCreateFact(user.id, "Inception")).rejects.toBeInstanceOf(FactUnavailableError);
  });

  it("treats an empty completion as a failure", async () => {
    const user = await makeUser();
    const empty: FactGenerator = { generate: async () => "   " };
    const service = createFactService({ db, generator: empty });

    await expect(service.getOrCreateFact(user.id, "Inception")).rejects.toBeInstanceOf(FactUnavailableError);
    expect(await db.fact.count()).toBe(0);
  });

  it("a failed generation does not poison the next attempt", async () => {
    const user = await makeUser();
    let fail = true;
    const flaky: FactGenerator = {
      generate: async () => {
        if (fail) throw new Error("boom");
        return "Recovered fact";
      },
    };
    const service = createFactService({ db, generator: flaky });

    await expect(service.getOrCreateFact(user.id, "Inception")).rejects.toBeInstanceOf(FactUnavailableError);
    fail = false;
    const result = await service.getOrCreateFact(user.id, "Inception");

    expect(result.source).toBe("generated");
    expect(result.fact.content).toBe("Recovered fact");
  });
});
