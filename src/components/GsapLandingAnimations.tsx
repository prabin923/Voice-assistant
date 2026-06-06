"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function GsapLandingAnimations() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      gsap.set("[data-gsap]", { clearProps: "all" });
      return undefined;
    }

    const ctx = gsap.context(() => {
      const hoverCleanups: Array<() => void> = [];
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTimeline
        .from("[data-gsap='nav']", { y: -20, opacity: 0, duration: 0.7 })
        .from(
          "[data-gsap='hero-copy'] > *",
          { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 },
          "-=0.28",
        )
        .from(
          "[data-gsap='pipeline']",
          { y: 34, opacity: 0, scale: 0.98, duration: 0.9 },
          "-=0.36",
        );

      gsap.to("[data-gsap='talk-console']", {
        y: -8,
        duration: 1.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to("[data-gsap='wave-bar']", {
        scaleY: () => gsap.utils.random(0.45, 1.25),
        transformOrigin: "bottom center",
        duration: () => gsap.utils.random(0.45, 0.95),
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: {
          each: 0.018,
          from: "center",
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-gsap-section]").forEach((section) => {
        gsap.from(section.querySelectorAll("[data-gsap-card], [data-gsap-item]"), {
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            once: true,
          },
          y: 22,
          opacity: 0,
          duration: 0.72,
          ease: "power3.out",
          stagger: 0.08,
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-gsap-card]").forEach((card) => {
        const lift = gsap.to(card, {
          y: -5,
          borderColor: "#3f3f46",
          duration: 0.24,
          ease: "power2.out",
          paused: true,
        });

        const play = () => lift.play();
        const reverse = () => lift.reverse();

        card.addEventListener("mouseenter", play);
        card.addEventListener("mouseleave", reverse);
        hoverCleanups.push(() => {
          card.removeEventListener("mouseenter", play);
          card.removeEventListener("mouseleave", reverse);
        });
      });

      return () => {
        hoverCleanups.forEach((cleanup) => cleanup());
      };
    });

    return () => ctx.revert();
  }, []);

  return null;
}
