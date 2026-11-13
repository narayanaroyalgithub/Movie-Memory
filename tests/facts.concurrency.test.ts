import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createFactService } from "@/lib/facts/service";
import { fakeGenerator, makeUser, resetDb } from "./helpers";

describe("burst / multi-tab protection", () => {
  beforeEach(resetDb);

  it("8 simultaneous requests for one user+movie cause exactly one generation", async () => {
    const user = await makeUser();
    const gen = fakeGenerator({ delayMs: 250 });
    const service = createFactService({ db, generator: gen.generator });

    const results = await Promise.all(Array.from({ length: 8 }, () => service.getOrCreateFact(user.id, "Inception")));

    expect(gen.calls()).toBe(1);
    expect(gen.maxInFlight()).toBe(1);
    expect(await db.fact.count({ where: { userId: user.id } })).toBe(1);
    expect(new Set(results.map((r) => r.fact.id)).size).toBe(1);
    expect(results.filter((r) => r.source === "generated")).toHaveLength(1);
    expect(results.filter((r) => r.source === "cache")).toHaveLength(7);
  });

  it("different users are NOT serialised against each other", async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const gen = fakeGenerator({ delayMs: 250 });
    const service = createFactService({ db, generator: gen.generator });

    await Promise.all([service.getOrCreateFact(a.id, "Inception"), service.getOrCreateFact(b.id, "Inception")]);

    expect(gen.calls()).toBe(2);
    expect(gen.maxInFlight()).toBe(2); // ran in parallel
  });
});
