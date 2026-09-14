"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TbMessageCircle } from "@/components/ui/icons";

/** Persistent entry to chat on every shell page except chat itself. */
export function FloatingChat() {
  const path = usePathname() || "";
  if (path.startsWith("/chat") || path.startsWith("/admin")) return null;

  return (
    <Link
      href="/chat"
      aria-label="Open chat"
      className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-ink text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] transition hover:scale-105 hover:opacity-95 active:scale-95 md:bottom-6 md:right-6"
    >
      <TbMessageCircle size={22} />
    </Link>
  );
}
