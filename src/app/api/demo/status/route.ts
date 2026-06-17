export const dynamic = "force-dynamic";

import { getDemoStats } from "@/lib/store";

export async function GET() {
  const stats = await getDemoStats();
  const twilioConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
  );

  return Response.json({
    demoMode: process.env.DEMO_MODE !== "false",
    seedDemoData: process.env.SEED_DEMO_DATA !== "false",
    database: Boolean(process.env.DATABASE_URL),
    twilioConfigured,
    ...stats,
  });
}
