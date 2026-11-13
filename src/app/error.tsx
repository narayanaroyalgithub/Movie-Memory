"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-2xl">That didn’t load</h1>
      <p className="text-ink-soft">Something went wrong on our side. Try again; if it keeps happening, come back in a few minutes.</p>
      <div><Button onClick={reset}>Try again</Button></div>
    </main>
  );
}
