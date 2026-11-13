import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Data Access Layer: the *real* authentication check.
 * Middleware is only an optimistic redirect; every protected page, action and
 * route handler resolves the user through here, from the DB, so a deleted user
 * with a still-valid JWT is treated as signed out.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, favoriteMovie: true },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** For /dashboard: signed in AND onboarded. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.favoriteMovie) redirect("/onboarding");
  return { ...user, favoriteMovie: user.favoriteMovie };
}

/** For /onboarding: signed in AND not yet onboarded. */
export async function requireNotOnboardedUser() {
  const user = await requireUser();
  if (user.favoriteMovie) redirect("/dashboard");
  return user;
}
