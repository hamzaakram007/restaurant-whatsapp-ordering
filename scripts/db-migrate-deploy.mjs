import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const neonDir = path.join(__dirname, "..", "neon");
const migrationsDir = path.join(neonDir, "migrations");

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
    const schemaPath = path.join(neonDir, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      await client.query(fs.readFileSync(schemaPath, "utf8"));
      console.log("Applied schema.sql");
    }

    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();
      for (const file of migrationFiles) {
        await client.query(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
        console.log(`Applied migrations/${file}`);
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
