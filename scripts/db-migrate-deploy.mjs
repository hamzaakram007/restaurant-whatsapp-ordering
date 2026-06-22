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
  const optionGroups = await client.query(`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'menu_items' and column_name = 'option_groups'
    limit 1
  `);
  if (optionGroups.rowCount > 0) {
    await recordMigration(client, "002_menu_option_groups.sql");
  }

  const restaurants = await client.query(`
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurants'
    limit 1
  `);
  const multiTenant = await client.query(`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'restaurant_id'
    limit 1
  `);
  if (restaurants.rowCount > 0 || multiTenant.rowCount > 0) {
    await recordMigration(client, "003_multi_tenant.sql");
  }

  const branches = await client.query(`
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'branches'
    limit 1
  `);
  if (branches.rowCount > 0) {
    await recordMigration(client, "004_branches.sql");
  }

  console.log("Reconciled schema_migrations with current database state.");
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
