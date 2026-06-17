export const dynamic = "force-dynamic";

import { resetDemoData } from "@/lib/store";

export async function POST() {
  const summary = await resetDemoData();
  return Response.json({
    ok: true,
    message: "Demo data reseeded",
    ...summary,
  });
}
