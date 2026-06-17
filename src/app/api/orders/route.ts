export const dynamic = "force-dynamic";

import { ensureStoreReady, listOrders } from "@/lib/store";

export async function GET(request: Request) {
  await ensureStoreReady();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");

  const orders = await listOrders({
    status: status ? status.split(",") as never : undefined,
    paymentStatus: paymentStatus ? paymentStatus.split(",") as never : undefined,
  });

  return Response.json({ orders });
}
