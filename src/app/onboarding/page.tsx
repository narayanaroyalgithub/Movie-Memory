import type { Metadata } from "next";
import { requireNotOnboardedUser } from "@/lib/dal";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireNotOnboardedUser();
  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-6 py-20">
      <h1 className="font-display text-4xl leading-tight">
        {firstName ? `${firstName}, what’s your favorite movie?` : "What’s your favorite movie?"}
      </h1>
      <p className="mt-3 text-ink-soft">We’ll use it to pick fun facts for you. You can only set it once for now.</p>
      <OnboardingForm />
    </main>
  );
}
