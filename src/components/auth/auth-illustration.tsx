"use client";

import Image from "next/image";
import { ROBOT_HERO_SRC } from "@/components/auth/robot-hero-data";

/**
 * Right-side illustration for auth — exact reference art (robot + scene).
 */
export function AuthIllustration() {
  return (
    <div className="relative h-full min-h-[640px] w-full overflow-hidden bg-[#eef1ff]">
      <Image
        src={ROBOT_HERO_SRC}
        alt="Trove AI workspace — from ideas to real outcomes"
        fill
        priority
        sizes="(min-width: 1024px) 54vw, 100vw"
        className="object-cover object-center"
        unoptimized
      />
      {/* Soft edge so the form panel blends cleanly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/40 to-transparent"
      />
    </div>
  );
}
