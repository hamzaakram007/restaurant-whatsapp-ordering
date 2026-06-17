const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function check(path) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { path, ok: response.ok, status: response.status, json, text: text.slice(0, 120) };
}

async function main() {
  const checks = [
    await check("/"),
    await check("/api/health"),
    await check("/api/demo/status"),
    await check("/api/orders"),
    await check("/api/twilio/whatsapp"),
    await check("/api/twilio/setup"),
  ];

  for (const result of checks) {
    const label = result.ok ? "OK" : "FAIL";
    console.log(`${label} ${result.status} ${result.path}`);
    if (result.json) {
      console.log(JSON.stringify(result.json));
    }
  }

  const health = checks[1].json;
  if (!checks.every((result) => result.ok)) {
    process.exit(1);
  }

  if (health?.storage !== "neon-postgres") {
    console.warn("Warning: DATABASE_URL not configured on deployment (using in-memory demo mode).");
  }

  const twilioSetup = checks.find((result) => result.path === "/api/twilio/setup")?.json;
  if (!twilioSetup?.twilioConfigured) {
    console.warn("Warning: Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for live WhatsApp demo.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
