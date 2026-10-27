import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.pgdata');
const port = Number(process.env.PG_PORT ?? 5433);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
});

if (!existsSync(dataDir)) {
  await pg.initialise();
}
await pg.start();

try {
  await pg.createDatabase('newreplica');
} catch {
  // already exists
}

console.log(`Embedded Postgres running on port ${port} (data: ${dataDir}). Ctrl+C to stop.`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
