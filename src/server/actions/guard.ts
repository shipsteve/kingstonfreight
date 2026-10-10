import { UnauthorizedError } from "../session";
import { fail, type ActionResult } from "../result";

/** Turns auth failures thrown by requireUser/requireAdmin into ActionResult errors. */
export async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UnauthorizedError) return fail(e.message);
    throw e;
  }
}
