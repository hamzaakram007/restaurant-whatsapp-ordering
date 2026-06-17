export const dynamic = "force-dynamic";

import { z } from "zod";
import { getAllMenuItems, getCategories, upsertMenuItem } from "@/lib/store";
import type { MenuItem } from "@/lib/types";

const optionChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  priceDeltaCents: z.number().int(),
});

const optionGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean(),
  choices: z.array(optionChoiceSchema).min(1),
});

const menuItemSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  priceCents: z.number().int().positive(),
  available: z.boolean().default(true),
  prepMinutes: z.number().int().positive().default(10),
  optionGroups: z.array(optionGroupSchema).default([]),
  imageUrl: z.string().optional(),
});

export async function GET() {
  const [items, categories] = await Promise.all([getAllMenuItems(), getCategories()]);
  return Response.json({ items, categories });
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
  const items = await getAllMenuItems();
  const existing = items.find((item) => item.id === body.id);
  if (!existing) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  const item = await upsertMenuItem({
    ...existing,
    ...body,
    optionGroups: body.optionGroups ?? existing.optionGroups,
  } as MenuItem);
  return Response.json({ item });
}
