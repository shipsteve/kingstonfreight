import EmbeddedPostgres from "embedded-postgres";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

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

/** Stops a Postgres left running in `dir` by a previous run that was killed without cleanup (common on Windows). */
export async function stopStalePg(dir: string): Promise<void> {
  if (!existsSync(`${dir}/postmaster.pid`)) return;
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const pg_ctl = path.join(
    process.cwd(),
    "node_modules/@embedded-postgres",
    `${platform}-${process.arch}`,
    "native/bin",
    process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl",
  );
  try {
    execFileSync(pg_ctl, ["stop", "-D", dir, "-m", "immediate"], { stdio: "ignore" });
  } catch {
    // not running; stale pid file only
  }
  if (process.platform === "win32") killOrphanWorkersWindows();
}

/**
 * When a test runner force-kills the postmaster on Windows, its worker processes can survive holding the
 * listen socket. Kill only this project's embedded-postgres workers whose parent no longer exists.
 */
function killOrphanWorkersWindows() {
  const binDir = path.join(process.cwd(), "node_modules", "@embedded-postgres").replace(/\\/g, "/");
  const script =
    `Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | ` +
    `Where-Object { $_.CommandLine -like '*${binDir}*' -and -not (Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue) } | ` +
    `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  try {
    execFileSync("powershell", ["-NoProfile", "-Command", script], { stdio: "ignore" });
  } catch {
    // best effort
  }
}
