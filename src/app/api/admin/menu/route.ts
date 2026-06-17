export const dynamic = "force-dynamic";

import { z } from "zod";
import { getMenuItems, upsertMenuItem } from "@/lib/store";
import type { MenuItem } from "@/lib/types";

const menuItemSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  priceCents: z.number().int().positive(),
  available: z.boolean().default(true),
  prepMinutes: z.number().int().positive().default(10),
  modifiers: z.array(z.string()).default([]),
  imageUrl: z.string().optional(),
});

export async function GET() {
  return Response.json({ items: await getMenuItems() });
}

export async function POST(request: Request) {
  const body = menuItemSchema.parse(await request.json());
  const item = await upsertMenuItem(body as MenuItem);
  return Response.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = menuItemSchema.partial().extend({ id: z.string() }).parse(
    await request.json(),
  );
  const items = await getMenuItems();
  const existing = items.find((item) => item.id === body.id);
  if (!existing) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  const item = await upsertMenuItem({ ...existing, ...body } as MenuItem);
  return Response.json({ item });
}
