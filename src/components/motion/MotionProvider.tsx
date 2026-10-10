"use client";

import { ThemeProvider } from "next-themes";

/** App-wide client providers. Framer's MotionConfig lives in the components that use motion, keeping it off the landing page. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
