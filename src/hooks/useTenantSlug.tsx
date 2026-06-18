"use client";

import { createContext, useContext } from "react";

const TenantSlugContext = createContext<string | undefined>(undefined);

export function TenantSlugProvider({
  slug,
  children,
}: {
  slug?: string;
  children: React.ReactNode;
}) {
  return (
    <TenantSlugContext.Provider value={slug}>{children}</TenantSlugContext.Provider>
  );
}

export function useTenantSlug(): string | undefined {
  return useContext(TenantSlugContext);
}

export function tenantApiUrl(path: string, slug?: string): string {
  if (!slug) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}hotel=${encodeURIComponent(slug)}`;
}
