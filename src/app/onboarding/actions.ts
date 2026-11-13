"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { movieSchema } from "@/lib/validation";

export interface OnboardingState {
  error?: string;
  value?: string;
}

export async function saveFavoriteMovie(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  // Server actions are public POST endpoints: authenticate here, never trust the page guard.
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.favoriteMovie) redirect("/dashboard"); // onboarding is first-time only

  const raw = formData.get("movie");
  const parsed = movieSchema.safeParse(typeof raw === "string" ? raw : undefined);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a movie title.", value: typeof raw === "string" ? raw : "" };
  }

  // The where clause uses the session user's id; there is no client-supplied user id anywhere.
  await db.user.update({ where: { id: user.id }, data: { favoriteMovie: parsed.data } });
  redirect("/dashboard");
}
