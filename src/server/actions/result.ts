import "server-only";
import { z } from "zod";
import { AuthorizationError } from "@/server/auth/permissions";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Wraps a server action body: validates input with zod and turns expected
 * failures into `{ ok: false }` so the client can toast them. Unexpected
 * errors are logged and reported generically.
 */
export async function run<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  body: (data: z.infer<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    return { ok: true, data: await body(parsed.data) };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    console.error("[action]", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export class UserFacingError extends Error {}
