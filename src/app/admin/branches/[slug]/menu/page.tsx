"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Branch, BranchMenuOverride, MenuItem } from "@/lib/types";

export default function BranchMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [masterItems, setMasterItems] = useState<MenuItem[]>([]);
  const [overrides, setOverrides] = useState<BranchMenuOverride[]>([]);
  const [branchOnlyItems, setBranchOnlyItems] = useState<MenuItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    void fetch(`/api/admin/branches/${slug}/menu`)
      .then((r) => r.json())
      .then(
        (data: {
          branch: Branch;
          masterItems: MenuItem[];
          overrides: BranchMenuOverride[];
          branchOnlyItems: MenuItem[];
        }) => {
          setBranch(data.branch);
          setMasterItems(data.masterItems);
          setOverrides(data.overrides);
          setBranchOnlyItems(data.branchOnlyItems);
        },
      );
  }, [slug]);

  async function toggleAvailable(menuItemId: string, available: boolean) {
    if (!slug) return;
    await fetch(`/api/admin/branches/${slug}/menu`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ override: { menuItemId, available } }),
    });
    setSaved(true);
    const override = overrides.find((o) => o.menuItemId === menuItemId);
    if (override) {
      setOverrides(
        overrides.map((o) => (o.menuItemId === menuItemId ? { ...o, available } : o)),
      );
    } else if (branch) {
      setOverrides([...overrides, { branchId: branch.id, menuItemId, available }]);
    }
  }

  async function setOverridePrice(menuItemId: string, priceCents: number) {
    if (!slug || !branch) return;
    await fetch(`/api/admin/branches/${slug}/menu`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ override: { menuItemId, priceCents } }),
    });
    setSaved(true);
    const existing = overrides.find((o) => o.menuItemId === menuItemId);
    if (existing) {
      setOverrides(
        overrides.map((o) => (o.menuItemId === menuItemId ? { ...o, priceCents } : o)),
      );
    } else {
      setOverrides([...overrides, { branchId: branch.id, menuItemId, priceCents }]);
    }
  }

  if (!slug || !branch) return <p className="p-8">Loading...</p>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin/branches" className="text-sm text-amber-700 underline">
        All branches
      </Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold">{branch.name} menu</h1>
      <p className="mb-8 text-stone-600">
        Override master menu prices and availability for this branch.
      </p>

      <section className="mb-10 space-y-3">
        <h2 className="font-semibold">Master menu overrides</h2>
        {masterItems.map((item) => {
          const override = overrides.find((o) => o.menuItemId === item.id);
          const effectivePrice = override?.priceCents ?? item.priceCents;
          const effectiveAvailable = override?.available ?? item.available;
          return (
            <article key={item.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-stone-500">
                    Master {formatMoney(item.priceCents)} → Branch{" "}
                    {formatMoney(effectivePrice)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={effectiveAvailable}
                      onChange={(e) => void toggleAvailable(item.id, e.target.checked)}
                    />
                    Available
                  </label>
                  <input
                    type="number"
                    className="w-28 rounded border px-2 py-1 text-sm"
                    defaultValue={effectivePrice}
                    onBlur={(e) =>
                      void setOverridePrice(item.id, Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {branchOnlyItems.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold">Branch-only items</h2>
          <ul className="space-y-2 text-sm">
            {branchOnlyItems.map((item) => (
              <li key={item.id} className="rounded-lg border bg-amber-50 px-3 py-2">
                {item.name} — {formatMoney(item.priceCents)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {saved ? <p className="mt-6 text-sm text-emerald-700">Saved.</p> : null}
    </main>
  );
}
