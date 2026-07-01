"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { withTenantQuery } from "@/lib/client-tenant-query";
import type { Branch, BranchConfig, Restaurant, RestaurantConfig } from "@/lib/types";

type TenantState = {
  restaurant: Restaurant | null;
  branch: Branch | null;
  branches: Branch[];
  config: BranchConfig | null;
  restaurantConfig: RestaurantConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const TenantContext = createContext<TenantState>({
  restaurant: null,
  branch: null,
  branches: [],
  config: null,
  restaurantConfig: null,
  loading: true,
  error: null,
  refresh: () => undefined,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<TenantState, "refresh">>({
    restaurant: null,
    branch: null,
    branches: [],
    config: null,
    restaurantConfig: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      const response = await fetch(withTenantQuery("/api/tenant"), { cache: "no-store" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setState({
          restaurant: null,
          branch: null,
          branches: [],
          config: null,
          restaurantConfig: null,
          loading: false,
          error: data.error ?? "Tenant not found",
        });
        return;
      }
      const data = (await response.json()) as {
        restaurant: Restaurant;
        branch: Branch;
        config: BranchConfig;
        branches: Branch[];
        restaurantConfig: RestaurantConfig;
      };
      setState({
        restaurant: data.restaurant,
        branch: data.branch,
        branches: data.branches,
        config: data.config,
        restaurantConfig: data.restaurantConfig,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        restaurant: null,
        branch: null,
        branches: [],
        config: null,
        restaurantConfig: null,
        loading: false,
        error: "Failed to load tenant",
      });
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <TenantContext.Provider value={{ ...state, refresh: load }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
