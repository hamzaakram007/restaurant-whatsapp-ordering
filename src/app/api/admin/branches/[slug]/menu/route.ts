export const dynamic = "force-dynamic";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  getBranchBySlug,
  getBranchOverrides,
  getBranchOnlyItems,
  upsertBranchOverride,
  upsertBranchOnlyItem,
} from "@/lib/branch-store";
import { getEffectiveMenuItems } from "@/lib/branch-menu";
import { getAllMenuItems, getCategories } from "@/lib/store";
import { requireRestaurantFromRequest, tenantErrorResponse } from "@/lib/tenant-context";

const overrideSchema = z.object({
  menuItemId: z.string(),
  available: z.boolean().optional(),
  priceCents: z.number().int().positive().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const branchItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  available: z.boolean().optional(),
  prepMinutes: z.number().int().positive().optional(),
  optionGroups: z.array(z.any()).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const restaurant = await requireRestaurantFromRequest(request);
    const branch = await getBranchBySlug(restaurant.id, slug);
    if (!branch) {
      return Response.json({ error: "Branch not found" }, { status: 404 });
    }

    const [categories, masterItems, effectiveItems, overrides, branchOnlyItems] =
      await Promise.all([
        getCategories(restaurant.id),
        getAllMenuItems(restaurant.id),
        getEffectiveMenuItems(restaurant.id, branch.id, undefined, true),
        getBranchOverrides(branch.id),
        getBranchOnlyItems(branch.id),
      ]);

    return Response.json({
      branch,
      categories,
      masterItems,
      effectiveItems,
      overrides,
      branchOnlyItems,
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== "owner" && session.role !== "counter")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const restaurant = await requireRestaurantFromRequest(request);
    const branch = await getBranchBySlug(restaurant.id, slug);
    if (!branch) {
      return Response.json({ error: "Branch not found" }, { status: 404 });
    }

    const body = z
      .object({
        override: overrideSchema.optional(),
        branchItem: branchItemSchema.optional(),
      })
      .parse(await request.json());

    if (body.override) {
      await upsertBranchOverride({
        branchId: branch.id,
        ...body.override,
      });
    }
    if (body.branchItem) {
      await upsertBranchOnlyItem(branch.id, {
        ...body.branchItem,
        description: body.branchItem.description ?? "",
        available: body.branchItem.available ?? true,
        prepMinutes: body.branchItem.prepMinutes ?? 10,
        optionGroups: body.branchItem.optionGroups ?? [],
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return tenantErrorResponse(error);
  }
}
