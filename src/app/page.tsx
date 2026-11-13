import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/dal";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  AccessDenied: "Google couldn’t confirm that email address. Use a Google account with a verified email.",
};

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");

  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Sign-in didn’t work. Please try again.") : null;

  async function signInWithGoogle() {
    "use server";
    // New users land on /dashboard, whose guard sends them to /onboarding until a movie is saved.
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl content-center gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:items-center">
      <div>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
          The movie you love has a story you haven’t heard.
        </h1>
        <p className="mt-6 max-w-md text-lg text-ink-soft">
          Tell us your favorite film once. Come back any time for a fun fact about it.
        </p>
        <form action={signInWithGoogle} className="mt-10">
          <Button type="submit" className="px-6 py-3 text-base">Sign in with Google</Button>
        </form>
        {message && <p role="alert" className="mt-4 text-sm text-alert">{message}</p>}
      </div>

      {/* The one memorable element: a ticket stub. */}
      <div aria-hidden="true" className="ticket p-8 [--stub-y:70%]">
        <p className="font-display text-2xl">Admit one</p>
        <p className="mt-1 text-sm text-ink-soft">Your favorite movie</p>
        <div className="my-6 border-t-2 border-dashed border-ink/20" />
        <p className="text-sm text-ink-soft">Fun fact, freshly picked</p>
        <div className="mt-3 h-2 w-3/4 rounded bg-ink/10" />
        <div className="mt-2 h-2 w-1/2 rounded bg-ink/10" />
      </div>
    </main>
  );
}
