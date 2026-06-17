import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const neonDir = path.join(__dirname, "..", "neon");

const schemaFile = "schema.sql";
const seedFiles = ["seed-menu.sql", "seed-demo.sql"];
const migrationsDir = path.join(neonDir, "migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Add it to .env.local or your shell environment.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const schemaPath = path.join(neonDir, schemaFile);
    if (fs.existsSync(schemaPath)) {
      await client.query(fs.readFileSync(schemaPath, "utf8"));
      console.log(`Applied ${schemaFile}`);
    }

    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        await client.query(fs.readFileSync(filePath, "utf8"));
        console.log(`Applied migrations/${file}`);
      }
    }

    for (const file of seedFiles) {
      const filePath = path.join(neonDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipping missing file: ${file}`);
        continue;
      }
      await client.query(fs.readFileSync(filePath, "utf8"));
      console.log(`Applied ${file}`);
    }

    console.log("Neon migrations completed successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
