import { beforeEach, describe, expect, it, vi } from "vitest";

// The route is exercised without a DB or OpenAI: auth and the service are mocked at their boundaries.
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/facts", () => ({ factService: { getOrCreateFact: vi.fn() } }));

import { GET } from "@/app/api/fact/route";
import { getCurrentUser } from "@/lib/dal";
import { factService } from "@/lib/facts";
import { FactUnavailableError } from "@/lib/facts/errors";

const mockedUser = vi.mocked(getCurrentUser);
const mockedFacts = vi.mocked(factService.getOrCreateFact);
const req = (qs = "") => new Request(`http://localhost/api/fact${qs}`);

const sessionUser = { id: "user-A", name: "A", email: "a@example.com", image: null, favoriteMovie: "Inception" };

describe("GET /api/fact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("401 when unauthenticated, and never touches the service", async () => {
    mockedUser.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
    expect(mockedFacts).not.toHaveBeenCalled();
  });

  it("409 when the user has not onboarded", async () => {
    mockedUser.mockResolvedValue({ ...sessionUser, favoriteMovie: null });
    const res = await GET(req());
    expect(res.status).toBe(409);
    expect(mockedFacts).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied userId: only the session user is ever queried", async () => {
    mockedUser.mockResolvedValue(sessionUser);
    mockedFacts.mockResolvedValue({
      fact: { id: "f1", movieTitle: "Inception", content: "Fact", createdAt: new Date("2026-01-01T00:00:00Z") },
      source: "generated",
      nextRefreshInMs: 60_000,
    });

    const res = await GET(req("?userId=user-B&movie=Heat"));

    expect(res.status).toBe(200);
    expect(mockedFacts).toHaveBeenCalledTimes(1);
    expect(mockedFacts).toHaveBeenCalledWith("user-A", "Inception");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.fact.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(body.source).toBe("generated");
  });

  it("503 with a friendly message (no internals) when generation is unavailable", async () => {
    mockedUser.mockResolvedValue(sessionUser);
    mockedFacts.mockRejectedValue(new FactUnavailableError("OpenAI 500 sk-secret-details"));

    const res = await GET(req());
    const text = await res.text();

    expect(res.status).toBe(503);
    expect(text).toMatch(/try again/i);
    expect(text).not.toMatch(/sk-secret|OpenAI/);
  });

  it("500 with a generic message on unexpected errors", async () => {
    mockedUser.mockResolvedValue(sessionUser);
    mockedFacts.mockRejectedValue(new Error("db exploded: password=hunter2"));

    const res = await GET(req());

    expect(res.status).toBe(500);
    expect(await res.text()).not.toMatch(/hunter2/);
  });
});
