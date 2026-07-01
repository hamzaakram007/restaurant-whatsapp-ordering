/** Append current page tenant/branch query params to API paths (client-side). */
export function withTenantQuery(path: string) {
  if (typeof window === "undefined") return path;

  const params = new URLSearchParams(window.location.search);
  const tenant = params.get("tenant");
  const branch = params.get("branch");
  if (!tenant && !branch) return path;

  const url = new URL(path, window.location.origin);
  if (tenant) url.searchParams.set("tenant", tenant);
  if (branch) url.searchParams.set("branch", branch);
  return `${url.pathname}${url.search}`;
}
