import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { factService } from "@/lib/facts";
import { FactUnavailableError } from "@/lib/facts/errors";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: NO_STORE });
}

/**
 * GET /api/fact
 *
 * Takes NO user identifier: the user and movie come from the session and the DB.
 * Anything in the query string or body is ignored, so reading another user's facts
 * is impossible by construction.
 */
export async function GET(_request: Request) {
  const user = await getCurrentUser();
  if (!user) return problem(401, "UNAUTHENTICATED", "Please sign in to continue.");
  if (!user.favoriteMovie) return problem(409, "NOT_ONBOARDED", "Choose your favorite movie first.");

  try {
    const { fact, source, nextRefreshInMs } = await factService.getOrCreateFact(user.id, user.favoriteMovie);
    return NextResponse.json(
      {
        fact: {
          id: fact.id,
          movieTitle: fact.movieTitle,
          content: fact.content,
          createdAt: fact.createdAt.toISOString(),
        },
        source,
        nextRefreshInMs,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof FactUnavailableError) {
      return problem(503, "FACT_UNAVAILABLE", error.userMessage);
    }
    console.error("[api/fact] unexpected error", error);
    return problem(500, "INTERNAL", "Something went wrong. Please try again.");
  }
}
