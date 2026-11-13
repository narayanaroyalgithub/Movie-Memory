import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16, "must be at least 16 characters"),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated, server-only environment. Evaluated lazily (not at import time) so
 * `next build` and unit tests don't need real secrets. Error messages list
 * variable names only, never values.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration -> ${problems}`);
  }
  cached = result.data;
  return cached;
}
