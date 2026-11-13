export class FactUnavailableError extends Error {
  /** Safe to show to end users. */
  readonly userMessage = "We couldn't fetch a fun fact right now. Please try again in a moment.";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FactUnavailableError";
  }
}
