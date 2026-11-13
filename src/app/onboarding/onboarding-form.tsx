"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { MOVIE_MAX_LENGTH } from "@/lib/validation";
import { saveFavoriteMovie, type OnboardingState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save and continue"}</Button>;
}

export function OnboardingForm() {
  const [state, action] = useActionState<OnboardingState, FormData>(saveFavoriteMovie, {});

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="movie" className="block text-sm font-medium">Favorite movie</label>
        <input
          id="movie"
          name="movie"
          type="text"
          required
          autoFocus
          autoComplete="off"
          maxLength={MOVIE_MAX_LENGTH}
          defaultValue={state.value}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "movie-error" : undefined}
          placeholder="e.g. Spirited Away"
          className="mt-2 w-full rounded-md border border-ink/25 bg-paper px-3 py-2.5 text-base placeholder:text-ink-faint"
        />
        {state.error && <p id="movie-error" role="alert" className="mt-2 text-sm text-alert">{state.error}</p>}
      </div>
      <Submit />
    </form>
  );
}
