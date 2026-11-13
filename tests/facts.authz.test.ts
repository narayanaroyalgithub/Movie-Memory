import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createFactService } from "@/lib/facts/service";
import { fakeGenerator, makeUser, resetDb } from "./helpers";

describe("authorization: user A cannot read user B's facts (service level)", () => {
  beforeEach(resetDb);

  it("two users with the same favorite movie never share cached facts", async () => {
    const [a, b] = await Promise.all([makeUser("Inception"), makeUser("Inception")]);
    const gen = fakeGenerator();
    const service = createFactService({ db, generator: gen.generator });

    const factA = await service.getOrCreateFact(a.id, "Inception");
    const factB = await service.getOrCreateFact(b.id, "Inception");

    expect(factB.source).toBe("generated"); // not served from A's cache
    expect(factB.fact.id).not.toBe(factA.fact.id);
    expect(gen.calls()).toBe(2);

    const rowsB = await db.fact.findMany({ where: { userId: b.id } });
    expect(rowsB.map((r) => r.id)).toEqual([factB.fact.id]);
  });

  it("a failing generator never falls back to another user's fact", async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    await createFactService({ db, generator: fakeGenerator().generator }).getOrCreateFact(a.id, "Inception");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const failing = createFactService({ db, generator: fakeGenerator({ fail: true }).generator });

    await expect(failing.getOrCreateFact(b.id, "Inception")).rejects.toThrow();
  });
});
