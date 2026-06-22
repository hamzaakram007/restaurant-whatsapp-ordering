"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTenant } from "@/components/TenantProvider";

export function BranchSwitcher() {
  const { branch, branches, loading } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (loading || !branch || branches.length <= 1) return null;

  function onChange(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", slug);
    document.cookie = `rwo_branch=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
    router.push(`${window.location.pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      <span className="font-medium">Branch</span>
      <select
        className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
        value={branch.slug}
        onChange={(e) => onChange(e.target.value)}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.slug}>
            {b.name}
            {b.city ? ` (${b.city})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
