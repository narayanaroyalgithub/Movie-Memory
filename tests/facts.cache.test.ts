import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createFactService } from "@/lib/facts/service";
import { FakeClock, fakeGenerator, makeUser, resetDb } from "./helpers";

describe("60-second cache window", () => {
  let clock: FakeClock;
  beforeEach(async () => {
    await resetDb();
    clock = new FakeClock();
  });

  const setup = () => {
    const gen = fakeGenerator();
    const service = createFactService({ db, generator: gen.generator, now: clock.now });
    return { gen, service };
  };

  it("generates and stores a fact on first request", async () => {
    const user = await makeUser();
    const { gen, service } = setup();

    const result = await service.getOrCreateFact(user.id, "Inception");

    expect(result.source).toBe("generated");
    expect(gen.calls()).toBe(1);
    expect(await db.fact.count({ where: { userId: user.id } })).toBe(1);
  });

  it("returns the cached fact when the latest is younger than 60s", async () => {
    const user = await makeUser();
    const { gen, service } = setup();
    const first = await service.getOrCreateFact(user.id, "Inception");

    clock.advance(59_999);
    const second = await service.getOrCreateFact(user.id, "Inception");

    expect(second.source).toBe("cache");
    expect(second.fact.id).toBe(first.fact.id);
    expect(second.nextRefreshInMs).toBe(1);
    expect(gen.calls()).toBe(1);
  });

  it("generates a new fact at exactly 60s (cache is strictly < 60s)", async () => {
    const user = await makeUser();
    const { gen, service } = setup();
    const first = await service.getOrCreateFact(user.id, "Inception");

    clock.advance(60_000);
    const second = await service.getOrCreateFact(user.id, "Inception");

    expect(second.source).toBe("generated");
    expect(second.fact.id).not.toBe(first.fact.id);
    expect(gen.calls()).toBe(2);
    expect(await db.fact.count({ where: { userId: user.id } })).toBe(2);
  });

  it("is a rolling window: the new fact starts a fresh 60s", async () => {
    const user = await makeUser();
    const { gen, service } = setup();
    await service.getOrCreateFact(user.id, "Inception");
    clock.advance(70_000);
    await service.getOrCreateFact(user.id, "Inception");

    clock.advance(30_000);
    const third = await service.getOrCreateFact(user.id, "Inception");

    expect(third.source).toBe("cache");
    expect(gen.calls()).toBe(2);
  });

  it("never serves a cached fact for a different movie", async () => {
    const user = await makeUser();
    const { gen, service } = setup();
    await service.getOrCreateFact(user.id, "Inception");

    const other = await service.getOrCreateFact(user.id, "Heat");

    expect(other.source).toBe("generated");
    expect(other.fact.movieTitle).toBe("Heat");
    expect(gen.calls()).toBe(2);
  });
});
