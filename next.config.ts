import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inlined into client bundles so prices format the same in the browser.
  env: { CURRENCY: process.env.CURRENCY ?? "USD", HOME_COUNTRY: process.env.HOME_COUNTRY ?? "US" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
