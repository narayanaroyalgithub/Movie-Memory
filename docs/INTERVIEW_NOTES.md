# Interview notes (rehearse these out loud)

## 30-second pitch
"I chose Variant A. The interesting problem is: the same user can fire many requests at once, OpenAI costs money and is slow, and the spec says a fact less than 60s old must be reused. I serialise generation per user+movie with a Postgres advisory transaction lock, re-check the cache after getting the lock, and fall back to the last fact if OpenAI fails. Concurrency is tested against a real database."

## Questions you will probably get

**Why this schema?**
`favoriteMovie` on User because there is exactly one and NULL is the onboarding flag. `Fact` is append-only with a snapshot of `movieTitle`, so the cache key is (user, movie) and changing the movie never serves a wrong fact. The composite index with `createdAt DESC` makes the latest-fact lookup one seek.

**Why an advisory lock and not a unique constraint?**
A unique constraint needs a fixed time bucket. A fact created at 00:59 and a request at 01:00 would both be "different windows" even though the fact is 1s old: that breaks "less than 60 seconds". The advisory lock keeps a true rolling window and works across instances.

**What is the double-check for?**
Request 2 passes the fast-path check (no fresh fact yet), then waits for the lock. When it gets the lock, request 1 has committed. Without re-reading inside the lock, request 2 would generate a second fact.

**Why READ COMMITTED?**
Under REPEATABLE READ the snapshot is taken at the first statement, before the lock wait ends, so the re-read would not see request 1's row. READ COMMITTED takes a fresh snapshot per statement.

**What happens if the process crashes while holding the lock?**
It is a transaction-scoped lock: the connection closes, Postgres rolls back and releases it. No stale flags.

**What is the downside?**
It holds a DB connection up to 8s per in-flight generation (and waiters hold one too). I bounded it with timeouts and would move to an in-progress row plus polling with more time.

**How do you stop user A reading user B's facts?**
There is no user id in any request. The route reads the user from the session via the DAL, and every query is scoped by that id. Tests prove same-movie users don't share cache or fallback, and that `?userId=` is ignored.

**Why is middleware not enough?**
Middleware only checks the JWT at the edge, and server actions are directly callable POST endpoints. The DAL re-checks against the DB on every page, action and route.

**What if OpenAI hangs?**
The SDK has an 8s timeout, and the service enforces its own 8s `Promise.race` + abort so correctness doesn't depend on the generator implementation. Then: stale fact if one exists, else a friendly 503.

**Why Vitest with real Postgres?**
A mocked DB can't tell you if a lock serialises requests. The concurrency test proves 8 parallel calls make 1 generation and 1 row.

**What did you not do?**
No rate limiting, no edit-movie flow, no e2e tests, facts are not verified for truth, app-clock vs DB-clock. (Be upfront; it reads as maturity.)

## Be ready to demo
1. Open dashboard in 3 tabs, refresh all at once → same fact; check `Fact` table has 1 row (`npm run db:studio`).
2. Wait 60s, refresh → new fact.
3. Set a bad `OPENAI_API_KEY`, wait for expiry → "earlier fact" fallback message.
