"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyHotelBrandTheme,
  buildSuggestedQuestions,
  DEFAULT_PUBLIC_HOTEL_CONFIG,
  getGuestWelcomeHeadline,
  getGuestWelcomeSubtext,
  HOTEL_CONFIG_UPDATED_EVENT,
  mergePublicHotelConfig,
  type PublicHotelConfig,
} from "@/lib/hotelBrand";

export function useHotelPublicConfig(hotelSlug?: string) {
  const [config, setConfig] = useState<PublicHotelConfig>(DEFAULT_PUBLIC_HOTEL_CONFIG);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(() =>
    buildSuggestedQuestions(DEFAULT_PUBLIC_HOTEL_CONFIG)
  );
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const url = hotelSlug
        ? `/api/config?hotel=${encodeURIComponent(hotelSlug)}`
        : "/api/config";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      const merged = mergePublicHotelConfig(data);
      setConfig(merged);
      setSuggestedQuestions(buildSuggestedQuestions(merged));
      applyHotelBrandTheme(merged.branding);
    } catch {
      setConfig({ ...DEFAULT_PUBLIC_HOTEL_CONFIG, aiReady: false, sttReady: false });
      setSuggestedQuestions(buildSuggestedQuestions(DEFAULT_PUBLIC_HOTEL_CONFIG));
      applyHotelBrandTheme(DEFAULT_PUBLIC_HOTEL_CONFIG.branding);
    } finally {
      setLoading(false);
    }
  }, [hotelSlug]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const onUpdate = () => {
      void loadConfig();
    };
    const onFocus = () => {
      void loadConfig();
    };

    window.addEventListener(HOTEL_CONFIG_UPDATED_EVENT, onUpdate);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(HOTEL_CONFIG_UPDATED_EVENT, onUpdate);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadConfig]);

  useEffect(() => {
    const name = config.branding.hotelName?.trim();
    document.title = name ? `${name} | Voice Concierge` : "Voice Concierge";
  }, [config.branding.hotelName]);

  return {
    config,
    branding: config.branding,
    welcomeHeadline: getGuestWelcomeHeadline(config.branding),
    welcomeSubtext: getGuestWelcomeSubtext(config.branding),
    suggestedQuestions,
    loading,
    reload: loadConfig,
  };
}
