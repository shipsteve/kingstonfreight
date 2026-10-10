/** revalidatePath throws outside a Next request (e.g. in integration tests); cache refresh is best-effort there. */
export function safeRevalidate(revalidate: (path: string) => void, path: string) {
  try {
    revalidate(path);
  } catch {
    // not in a Next.js request context
  }
}
