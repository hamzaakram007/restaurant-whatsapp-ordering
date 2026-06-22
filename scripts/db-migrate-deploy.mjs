import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const neonDir = path.join(__dirname, "..", "neon");
const migrationsDir = path.join(neonDir, "migrations");

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function isMigrationApplied(client, filename) {
  const result = await client.query(
    "select 1 from schema_migrations where filename = $1 limit 1",
    [filename],
  );
  return result.rowCount > 0;
}

async function recordMigration(client, filename) {
  await client.query(
    "insert into schema_migrations (filename) values ($1) on conflict (filename) do nothing",
    [filename],
  );
}

async function bootstrapAppliedMigrations(client) {
  const existing = await client.query("select filename from schema_migrations");
  if (existing.rowCount > 0) return;

  const branches = await client.query(`
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'branches'
    limit 1
  `);
  if (branches.rowCount > 0) {
    for (const file of ["002_menu_option_groups.sql", "003_multi_tenant.sql", "004_branches.sql"]) {
      await recordMigration(client, file);
    }
    console.log("Bootstrapped schema_migrations for existing branch-enabled database.");
    return;
  }

  const multiTenant = await client.query(`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'restaurant_id'
    limit 1
  `);
  if (multiTenant.rowCount > 0) {
    for (const file of ["002_menu_option_groups.sql", "003_multi_tenant.sql"]) {
      await recordMigration(client, file);
    }
    console.log("Bootstrapped schema_migrations for existing multi-tenant database.");
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("DATABASE_URL not set — skipping deploy migrations (in-memory demo mode).");
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory — skipping.");
      return;
    }

    await ensureMigrationTable(client);
    await bootstrapAppliedMigrations(client);

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      if (await isMigrationApplied(client, file)) {
        console.log(`Skipping migrations/${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await recordMigration(client, file);
        await client.query("commit");
        console.log(`Applied migrations/${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log("Deploy migrations completed.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Deploy migration failed:", error);
  process.exit(1);
});
