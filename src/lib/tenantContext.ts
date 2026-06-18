import { AsyncLocalStorage } from "async_hooks";
import { hotels, ensureDbReady } from "@/lib/db";
import {
  DEFAULT_HOTEL_CONFIG,
  type HotelConfig,
} from "@/lib/hotelConfig";
import { normalizeHotelSlug } from "@/lib/slug";

type TenantStore = {
  slug?: string;
  hotelId?: string;
  config: HotelConfig;
};

const tenantStorage = new AsyncLocalStorage<TenantStore>();
const configCache = new Map<string, { config: HotelConfig; loadedAt: number }>();
const CACHE_TTL_MS = 60_000;

function cacheKey(slug?: string, hotelId?: string): string {
  return slug ? `slug:${slug}` : hotelId ? `id:${hotelId}` : "default";
}

async function loadConfigForHotelRow(
  row: { id: string; config: string } | undefined
): Promise<{ hotelId?: string; config: HotelConfig }> {
  if (row?.config && row.config !== "{}") {
    return { hotelId: row.id, config: JSON.parse(row.config) as HotelConfig };
  }
  return { hotelId: row?.id, config: { ...DEFAULT_HOTEL_CONFIG } };
}

export async function resolveTenantConfig(options?: {
  slug?: string | null;
  hotelId?: string | null;
}): Promise<TenantStore> {
  const slug = normalizeHotelSlug(options?.slug ?? undefined);
  const hotelId = options?.hotelId?.trim() || undefined;
  const key = cacheKey(slug, hotelId);
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return { slug, hotelId: cached.config ? hotelId : undefined, config: cached.config };
  }

  await ensureDbReady();
  let row;
  if (slug) {
    row = await hotels.findBySlug(slug);
    if (!row) {
      throw new TenantNotFoundError(slug);
    }
  } else if (hotelId) {
    row = await hotels.findById(hotelId);
  } else {
    row = await hotels.getFirst();
  }

  const loaded = await loadConfigForHotelRow(row);
  const store: TenantStore = {
    slug,
    hotelId: loaded.hotelId,
    config: loaded.config,
  };
  configCache.set(key, { config: store.config, loadedAt: Date.now() });
  return store;
}

export class TenantNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super(`Hotel tenant not found: ${slug}`);
    this.name = "TenantNotFoundError";
  }
}

export function getTenantStore(): TenantStore | undefined {
  return tenantStorage.getStore();
}

export function getTenantConfig(): HotelConfig {
  return tenantStorage.getStore()?.config ?? DEFAULT_HOTEL_CONFIG;
}

export function getTenantSlug(): string | undefined {
  return tenantStorage.getStore()?.slug;
}

export async function runWithTenant<T>(
  options: { slug?: string | null; hotelId?: string | null },
  fn: () => Promise<T>
): Promise<T> {
  const store = await resolveTenantConfig(options);
  return tenantStorage.run(store, fn);
}

export function invalidateTenantConfigCache(slug?: string, hotelId?: string): void {
  if (slug) configCache.delete(cacheKey(slug));
  if (hotelId) configCache.delete(cacheKey(undefined, hotelId));
  configCache.delete(cacheKey());
}

export function tenantSlugFromRequest(req: Request): string | undefined {
  const url = new URL(req.url);
  const fromQuery = normalizeHotelSlug(url.searchParams.get("hotel"));
  if (fromQuery) return fromQuery;
  return normalizeHotelSlug(req.headers.get("x-hotel-slug"));
}
