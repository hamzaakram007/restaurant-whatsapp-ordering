export const DEFAULT_RESTAURANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_RESTAURANT_SLUG = "brew-bite";

export const PLATFORM_HOST =
  process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost:3000";

export function isApexHost(hostname: string) {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1") return true;
  const platformRoot = PLATFORM_HOST.split(":")[0]?.toLowerCase() ?? "";
  return host === platformRoot || host === `www.${platformRoot}`;
}

export function extractSubdomain(hostname: string) {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1") return null;
  if (host.endsWith(".vercel.app")) return null;
  const platformRoot = PLATFORM_HOST.split(":")[0]?.toLowerCase() ?? "";
  if (host === platformRoot || host === `www.${platformRoot}`) return null;
  if (host.endsWith(`.${platformRoot}`)) {
    return host.slice(0, -(platformRoot.length + 1)).split(".")[0] ?? null;
  }
  const parts = host.split(".");
  if (parts.length >= 3) return parts[0] ?? null;
  return null;
}

export function slugifyRestaurantName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
