import type { Metadata } from "next";
import { signOut } from "@/auth";
import { requireOnboardedUser } from "@/lib/dal";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FactCard } from "./fact-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  // Google may omit name or photo: fall back to the email's local part and initials.
  const displayName = user.name?.trim() || user.email.split("@")[0] || "there";

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={user.image} label={displayName} />
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
          </div>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost">Log out</Button>
        </form>
      </header>

      <section className="mt-14">
        <p className="text-sm text-ink-soft">Your favorite movie</p>
        <h1 className="mt-1 font-display text-4xl leading-tight md:text-5xl">{user.favoriteMovie}</h1>
      </section>

      <FactCard />
    </main>
  );
}
