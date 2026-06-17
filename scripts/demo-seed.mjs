const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function seed() {
  const response = await fetch(`${baseUrl}/api/demo/seed`, { method: "POST" });
  const data = await response.json();
  console.log("Demo seed:", data);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
