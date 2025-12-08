// lib/inngest/client.ts
import { Inngest } from "ingest";

export const inngest = new Inngest({
  id: "wealth", // Unique app ID — used in the Inngest dashboard
  name: "expense-tracker",
  // Optional: supply an eventKey here or set INNGEST_EVENT_KEY in env.
  // eventKey: process.env.INNGEST_EVENT_KEY, // optionally pass explicitly

  // Optional retry function example (keeps your exponential backoff)
  retryFunction: async (attempt) => ({
    delay: Math.pow(2, attempt) * 1000,
    maxAttempts: 2,
  }),
});
