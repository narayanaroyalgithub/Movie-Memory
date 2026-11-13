import { z } from "zod";

export const MOVIE_MIN_LENGTH = 1;
export const MOVIE_MAX_LENGTH = 100;

/**
 * Single source of truth for movie input. Runs on the server (server action);
 * the form's `maxLength` attribute is only a UX hint, never the guard.
 *
 *  - trims surrounding whitespace
 *  - rejects control / format characters (newlines, zero-width chars, etc.),
 *    which also keeps the value safe to embed in an LLM prompt
 *  - collapses runs of inner whitespace to a single space
 */
export const movieSchema = z
  .string({ required_error: "Enter a movie title.", invalid_type_error: "Enter a movie title." })
  .trim()
  .min(MOVIE_MIN_LENGTH, "Enter a movie title.")
  .max(MOVIE_MAX_LENGTH, `Use ${MOVIE_MAX_LENGTH} characters or fewer.`)
  .regex(/^[^\p{C}]+$/u, "Remove special or hidden characters from the title.")
  .transform((s) => s.replace(/\s+/g, " "));
