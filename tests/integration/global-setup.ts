import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { startLocalPg, stopStalePg, type LocalPg } from "../../scripts/pg";

const DIR = ".pgdata/test";
let local: LocalPg | undefined;

/** Fresh Postgres per run (so migrate deploy is enough) unless USE_EXTERNAL_TEST_DB=1 points at an external, already-empty DB. */
export async function setup() {
  let url = process.env.DATABASE_URL_TEST;
  if (process.env.USE_EXTERNAL_TEST_DB !== "1") {
    await stopStalePg(DIR);
  rmSync(DIR, { recursive: true, force: true });
    local = await startLocalPg({ dir: DIR, port: 5434, database: "shipping_test", persistent: false });
    url = local.url;
  }
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  process.env.DATABASE_URL_TEST = url;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

export async function teardown() {
  await local?.pg.stop();
}
