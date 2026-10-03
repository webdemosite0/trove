"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiArrowLeft } from "@/components/ui/icons";

/**
 * Returns the user to Trove or Tros.
 * Prefer ?from=tros | ?from=trove, else last product in sessionStorage, else dashboard.
 */
export function PlansBackLink() {
  const searchParams = useSearchParams();
  const [href, setHref] = useState("/dashboard");
  const [label, setLabel] = useState("Back to Trove");

  useEffect(() => {
    const from = (searchParams.get("from") || "").toLowerCase();
    let product: "tros" | "trove" = "trove";
    if (from === "tros") product = "tros";
    else if (from === "trove") product = "trove";
    else {
      try {
        const saved = sessionStorage.getItem("trove-last-product");
        if (saved === "tros") product = "tros";
      } catch {
        /* ignore */
      }
    }

    if (product === "tros") {
      setHref("/tros");
      setLabel("Back to Tros");
    } else {
      setHref("/dashboard");
      setLabel("Back to Trove");
    }
  }, [searchParams]);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition hover:border-line-strong hover:bg-hover hover:text-ink"
    >
      <FiArrowLeft size={14} />
      {label}
    </Link>
  );
}
