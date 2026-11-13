/** A fact for (user, movie) younger than this is served from the DB. */
export const CACHE_TTL_MS = 60_000;

/** Hard ceiling on one OpenAI call. Also bounds how long the per-user lock is held. */
export const GENERATION_TIMEOUT_MS = 30_000;

/** Interactive-transaction limits. timeout > GENERATION_TIMEOUT_MS so waiters outlast the lock holder. */
export const TX_MAX_WAIT_MS = 5_000;
export const TX_TIMEOUT_MS = 40_000;

