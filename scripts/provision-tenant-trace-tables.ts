/**
 * One-time migration script to create per-tenant Greptime trace tables
 * for all existing organizations.
 *
 * Usage: bun run scripts/provision-tenant-trace-tables.ts
 *
 * Requires:
 *   - AUTH_DATABASE_URL env var pointing to the auth Postgres database
 *   - GreptimeHost secret or localhost fallback for Greptime connection
 *
 * Idempotent — safe to re-run.
 */
import { createBunSqlClient, getGreptimeConnectionString } from "@hebo/shared-api/db/greptime";
import { ensureTenantTraceTable, orgIdToTableName } from "@hebo/shared-api/lib/trace-table";

const authDatabaseUrl = process.env.AUTH_DATABASE_URL;
if (!authDatabaseUrl) {
  console.error("AUTH_DATABASE_URL environment variable is required");
  process.exit(1);
}

const { SQL } = require("bun") as typeof Bun;
const authDb = new SQL({ url: authDatabaseUrl });
const greptimeDb = createBunSqlClient(await getGreptimeConnectionString());

const orgs = await authDb.unsafe<Array<{ id: string }>>(
  `SELECT id FROM organizations`,
);

console.log(`Found ${orgs.length} organizations`);

const results = await Promise.allSettled(
  orgs.map(async (org) => {
    const tableName = orgIdToTableName(org.id);
    await ensureTenantTraceTable(greptimeDb, org.id);
    console.log(`  ✓ ${tableName}`);
  }),
);

const failed = results.filter((r) => r.status === "rejected").length;
const created = results.length - failed;

for (const result of results) {
  if (result.status === "rejected") {
    console.error(`  ✗`, result.reason);
  }
}

console.log(`\nDone: ${created} created, ${failed} failed (of ${orgs.length} total)`);

await authDb.close();
await greptimeDb.close();

process.exit(failed > 0 ? 1 : 0);
