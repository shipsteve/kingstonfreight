// Playwright webServer: fresh embedded Postgres → migrate → seed → `next start` on :3200 in E2E test mode.
// Expects `next build` to have run already (playwright.config chains it).
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { seed } from "../prisma/seed";
import { startLocalPg, stopStalePg } from "./pg";

const PORT = "3200";
export const E2E_ADMIN = { email: "admin@e2e.test", password: "e2e-admin-pass" };

async function main() {
  await stopStalePg(".pgdata/e2e");
  rmSync(".pgdata/e2e", { recursive: true, force: true });
  const { pg, url } = await startLocalPg({ dir: ".pgdata/e2e", port: 5435, database: "shipping_e2e", persistent: false });

  const env = {
    ...process.env,
    DATABASE_URL: url,
    ADMIN_EMAIL: E2E_ADMIN.email,
    ADMIN_PASSWORD: E2E_ADMIN.password,
    APP_URL: `http://localhost:${PORT}`,
    AUTH_TRUST_HOST: "true",
    RESEND_API_KEY: "",
    GEOCODE_PROVIDER: "off",
    CHAIN_LOOKUP: "off",
    ALLOW_TEST_WALLET_ADDRESSES: "1",
    BTC_ADDRESS: "bc1q-e2e-test-address",
    LTC_ADDRESS: "ltc1q-e2e-test-address",
    MIN_TOPUP_USD: "50",
    COMPANY_LEGAL_NAME: "KingstonFreight LLC",
    SUPPORT_EMAIL: "support@e2e.test",
  };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  process.env.ADMIN_EMAIL = E2E_ADMIN.email;
  process.env.ADMIN_PASSWORD = E2E_ADMIN.password;
  const db = new PrismaClient({ datasourceUrl: url });
  await seed(db);
  await db.$disconnect();

  const server = spawn("npx", ["next", "start", "-p", PORT], { env, stdio: "inherit", shell: true });
  const stop = async () => {
    server.kill();
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.on("exit", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
