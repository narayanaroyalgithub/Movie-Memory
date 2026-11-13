# Movie Memory

Movie Memory lets you sign in with Google, save your favorite movie, and get a short fact about it. The fact is stored in Postgres, so refreshing the dashboard doesn't always mean another request to OpenAI.

This is my submission for the full-stack take-home exercise. I implemented the base app and **Variant A (backend caching and correctness)**.

## Setup instructions

You'll need Node.js 20.9 or newer, npm, Docker, a Google OAuth web client, and an OpenAI API key with available API quota.

```bash
npm install
cp .env.example .env
```

## Required environment variables

Fill in `.env` before starting the app:

- `DATABASE_URL`: connection to the main Postgres database.
- `DATABASE_URL_TEST`: connection to the separate test database. Tests remove data, so don't point this at your main database.
- `AUTH_SECRET`: secret used by Auth.js. Generate one with `openssl rand -base64 32`.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`: credentials for a Google OAuth **Web application** client.
- `OPENAI_API_KEY`: your OpenAI API key, used only on the server.
- `OPENAI_MODEL`: optional; defaults to `gpt-4o-mini`.

For local Google sign-in, register this authorized redirect URI in Google Cloud Console:

`http://localhost:3000/api/auth/callback/google`

Set up the OAuth consent screen as well. If the app is in testing mode, add the account you'll use to test it. A deployed version needs its own redirect URI for that domain.

The submitted app is configured to use the OpenAI SDK's standard endpoint. No `OPENAI_BASE_URL` setting is needed. Keep `.env` out of Git; `.env.example` is the file to share.

## Database migration steps

Start the database, apply the migration, and launch the app:

```bash
npm run db:up
npm run db:deploy
npm run dev
```

Open `http://localhost:3000`. Sign in with Google and enter a movie to reach the dashboard. You can stop the database with `npm run db:down`.

The Prisma schema is in `prisma/schema.prisma`, and existing migrations are in `prisma/migrations`. `npm run db:deploy` applies those migrations. If you change the schema while developing, create a migration with:

```bash
npm run db:migrate -- --name describe_your_change
```

`npm run db:studio` opens Prisma Studio if you want to inspect the records.

## Architecture overview

The app uses Next.js App Router, React, TypeScript, and Tailwind for the UI. Auth.js handles Google sign-in. Prisma connects the server-side code to Postgres. There are three main screens: the landing page, onboarding, and the dashboard.

When someone signs in, the app checks whether they already have a favorite movie saved. New users go to onboarding; returning users go to the dashboard. The movie is trimmed and validated on the server before it's saved. It must be between 1 and 100 characters, and control characters aren't accepted. Onboarding is a one-time step in this implementation.

The dashboard displays the user's Google name, email, and photo if available, their favorite movie from Postgres, and a logout button. There are fallbacks for missing names or photos. If someone opens `/dashboard` while signed out, they're redirected to the landing page. Protected pages and actions check the signed-in user on the server rather than relying only on middleware.

I kept `favoriteMovie` on the `User` record. The exercise asks for one favorite movie per user, so another table didn't seem necessary. A null value also gives the app a simple way to tell whether onboarding is complete. Each generated fact is stored separately with its user, movie title, text, and creation time. The movie title is saved with the fact so a fact for one movie can't be reused for another. An index on user, movie, and creation time helps find the newest matching fact.

The dashboard calls `GET /api/fact`. That route gets the user from the current session, reads their saved movie, and asks the fact service for a result. The browser doesn't provide a user ID. The service either returns a recent fact or generates and saves a new one. Responses identify whether the fact was generated, cached, or returned as a fallback. The route uses `Cache-Control: no-store`; the 60-second cache is managed in Postgres, not in the browser.

## Which variant I chose and why

I chose **Variant A**, which focuses on backend caching and correctness. The main challenge was making sure repeated requests, including requests arriving at the same time, would not trigger unnecessary AI calls.

### Caching and concurrent requests

A saved fact is considered fresh for **less than 60 seconds**. During that window, the service returns it without contacting OpenAI. Once it reaches 60 seconds, the service can generate another one.

There is a race here: two tabs can both see an expired fact and both start generating. I used a Postgres transaction-level advisory lock for the user/movie pair. After acquiring the lock, the service checks the database again. If another request already generated a fresh fact, the waiting request uses it. Otherwise, it calls OpenAI and saves the result. The lock is released when the transaction finishes, even on failure.

I chose a database lock rather than an in-memory one because an in-memory lock wouldn't coordinate requests across multiple app instances. The transaction uses `READ COMMITTED` isolation so the second lookup can see a fact committed while the request was waiting. The code and concurrency tests cover this behavior.

If OpenAI times out or fails, the service tries to return the latest older fact for that same user and movie. If no fact exists, `/api/fact` returns a friendly `503` response instead of exposing the provider's error. The OpenAI client has automatic retries disabled, so the service controls the failure path.

## Key tradeoffs

There are a few compromises in this approach. The transaction stays open while the external request runs, which holds a database connection longer than I'd want at higher traffic. The generation timeout and transaction timeout need to be coordinated; the transaction must allow enough time for generation and the database write. Cache age also uses the application clock, which could drift slightly between servers. Finally, the model can produce an incorrect fact; the prompt asks for a short, well-known fact, but the app doesn't independently verify it.

For a small take-home, I preferred this relatively contained implementation over adding a background job system or a separate generation-status table.

## Security and error handling

All user-specific queries are scoped to the signed-in user. Movie input is validated on the server, and the API key stays in server-only code. Movie titles are treated as data in the AI prompt, and fact text is displayed as ordinary React text rather than inserted as HTML. Failed generation doesn't expose internal error messages to the browser.

## Tests and checks

```bash
npm run typecheck
npm test
npm run build
```

My latest local run passed **27 tests across 6 files**, and both TypeScript checking and the production build passed. The tests cover validation, the 60-second cache boundary, concurrent requests, authorization, stale fallback, and API error responses. The concurrency tests use a real Postgres database so they exercise the advisory lock rather than a mock.

I also tested Google sign-in and generated a fact in the browser during development. That live generation test used Gemini temporarily while troubleshooting API access. The submitted configuration is intended for OpenAI, but I haven't completed a live OpenAI request with a funded API key, so I don't want to claim that test passed.

## What I would improve with two more hours

I'd start by moving the external AI call outside the long-running database transaction, with a short-lived generation state to coordinate requests. Then I'd add per-user rate limits, basic timing and error metrics, and an end-to-end browser test covering sign-in and onboarding. I'd also consider using the database clock for cache expiration and cleaning up old fact rows.


## Dashboard screenshot

Here's the dashboard after signing in and saving *Interstellar* as the favorite movie. It shows the account details, saved movie, generated fact, and the option to request another fact.

<img width="1728" height="1117" alt="Screenshot 2026-11-11 at 11 27 41 PM" src="https://github.com/user-attachments/assets/315e1cff-6426-4762-b362-893ad9c2f3ef" />

