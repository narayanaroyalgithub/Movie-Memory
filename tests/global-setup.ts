import "dotenv/config";
import { execSync } from "node:child_process";

/** Applies migrations to the TEST database once per run. Never touches DATABASE_URL (dev data). */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    console.warn("[tests] DATABASE_URL_TEST is not set: DB-backed tests will fail. See .env.example.");
    return;
  }
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch {
    console.warn("[tests] Could not migrate the test database. Is Postgres running (`npm run db:up`)?");
  }
}
