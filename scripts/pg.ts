import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

export type LocalPg = { pg: EmbeddedPostgres; url: string };

/** Starts a local Postgres from the embedded-postgres binaries (dev/test only). */
export async function startLocalPg(opts: {
  dir: string;
  port: number;
  database: string;
  persistent: boolean;
}): Promise<LocalPg> {
  const pg = new EmbeddedPostgres({
    databaseDir: opts.dir,
    port: opts.port,
    user: "postgres",
    password: "postgres",
    persistent: opts.persistent,
    onLog: () => {},
  });
  if (!existsSync(opts.dir)) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(opts.database);
  } catch {
    // already exists
  }
  return { pg, url: `postgresql://postgres:postgres@localhost:${opts.port}/${opts.database}` };
}
