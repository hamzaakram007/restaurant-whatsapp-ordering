export const dynamic = "force-dynamic";

import { getOrderById, getOrderEvents } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  return Response.json({
    order,
    events: await getOrderEvents(id),
  });
}
