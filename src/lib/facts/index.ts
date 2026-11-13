import "server-only";
import { db } from "@/lib/db";
import { createFactService } from "./service";
import { createOpenAiGenerator } from "./openai";

/** App-wide instance wired to the real DB and OpenAI. */
export const factService = createFactService({ db, generator: createOpenAiGenerator() });
