import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { AiNotConfiguredError, AiLimitError } from "./ai/errors";

/** Wrap a route handler so thrown errors become consistent JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError)
        return NextResponse.json({ error: "Invalid input.", issues: err.issues }, { status: 400 });
      if (err instanceof AiNotConfiguredError)
        return NextResponse.json({ error: err.message, code: "AI_NOT_CONFIGURED", service: err.service }, { status: 503 });
      if (err instanceof AiLimitError)
        return NextResponse.json({ error: err.message, code: "AI_LIMIT" }, { status: 429 });
      // Prisma "record not found" (e.g. editing something that was deleted meanwhile).
      if ((err as { code?: string })?.code === "P2025")
        return NextResponse.json({ error: "This item no longer exists. Reload the page and try again." }, { status: 404 });
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
