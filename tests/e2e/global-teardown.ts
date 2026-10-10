import { stopStalePg } from "../../scripts/pg";

// On Windows, Playwright force-kills the web server, which can't stop its Postgres; shut it down here.
export default async function globalTeardown() {
  await stopStalePg(".pgdata/e2e");
}
