import { describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  hashPassword,
  parseSessionToken,
  roleCanAccessRoute,
  verifyPassword,
} from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

const sampleUser: SessionUser = {
  userId: "user-1",
  email: "owner@test.com",
  name: "Owner",
  restaurantId: "restaurant-1",
  role: "owner",
};

describe("auth session tokens", () => {
  it("round-trips a valid session token", () => {
    const token = createSessionToken(sampleUser);
    const parsed = parseSessionToken(token);
    expect(parsed).toEqual(sampleUser);
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken(sampleUser);
    const [body] = token.split(".");
    const tampered = `${body}.invalid-signature`;
    expect(parseSessionToken(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    const token = createSessionToken(sampleUser);
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    expect(parseSessionToken(token)).toBeNull();
    vi.useRealTimers();
  });

  it("rejects missing token", () => {
    expect(parseSessionToken(undefined)).toBeNull();
  });
});

describe("roleCanAccessRoute", () => {
  it("allows owner on all staff routes", () => {
    expect(roleCanAccessRoute("owner", "/dashboard")).toBe(true);
    expect(roleCanAccessRoute("owner", "/kitchen")).toBe(true);
    expect(roleCanAccessRoute("owner", "/admin/settings")).toBe(true);
  });

  it("restricts counter to dashboard and selected admin pages", () => {
    expect(roleCanAccessRoute("counter", "/dashboard")).toBe(true);
    expect(roleCanAccessRoute("counter", "/admin/menu")).toBe(true);
    expect(roleCanAccessRoute("counter", "/admin/settings")).toBe(true);
    expect(roleCanAccessRoute("counter", "/kitchen")).toBe(false);
  });

  it("restricts kitchen to kitchen only", () => {
    expect(roleCanAccessRoute("kitchen", "/kitchen")).toBe(true);
    expect(roleCanAccessRoute("kitchen", "/dashboard")).toBe(false);
    expect(roleCanAccessRoute("kitchen", "/admin/settings")).toBe(false);
  });
});

describe("password hashing", () => {
  it("verifies a hashed password", () => {
    const stored = hashPassword("password123");
    expect(verifyPassword("password123", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });
});
