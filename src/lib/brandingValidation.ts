import type { BrandingConfig } from "@/lib/hotelConfig";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isSafePublicUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeAccentColor(value: string, fallback = "#c9a227"): string {
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

export function sanitizeBranding(branding: BrandingConfig): BrandingConfig {
  const next = { ...branding };
  next.accentColor = sanitizeAccentColor(branding.accentColor);
  if (branding.logoUrl?.trim()) {
    next.logoUrl = isSafePublicUrl(branding.logoUrl) ? branding.logoUrl.trim() : undefined;
  } else {
    next.logoUrl = undefined;
  }
  return next;
}
