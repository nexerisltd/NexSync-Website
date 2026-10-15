/**
 * Chatty per-connection / per-message logs are off by default: with thousands of listeners, console I/O alone
 * eats a noticeable share of a small CPU. Set VERBOSE_LOGS=1 to get them back while debugging.
 */
export const VERBOSE_LOGS = process.env.VERBOSE_LOGS === "1";

export function debug(...args: unknown[]): void {
  if (VERBOSE_LOGS) console.log(...args);
}
