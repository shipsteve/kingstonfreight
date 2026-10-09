import { startLocalPg } from "./pg";

async function main() {
  const { pg, url } = await startLocalPg({
    dir: ".pgdata/dev",
    port: 5433,
    database: "shipping",
    persistent: true,
  });
  console.log(`Dev Postgres running at ${url} (Ctrl+C to stop)`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
