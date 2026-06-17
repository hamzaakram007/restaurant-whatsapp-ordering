import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const neonDir = path.join(__dirname, "..", "neon");

const files = ["schema.sql", "seed-menu.sql", "seed-demo.sql"];

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
    for (const file of files) {
      const filePath = path.join(neonDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipping missing file: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
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
