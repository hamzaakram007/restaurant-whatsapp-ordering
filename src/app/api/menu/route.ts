export const dynamic = "force-dynamic";

import { getCategories, getMenuItems } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;

  return Response.json({
    categories: await getCategories(),
    items: await getMenuItems(categoryId),
  });
}
