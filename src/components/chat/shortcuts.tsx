"use client";

import Link from "next/link";
import { TbRobot, TbUsers, TbFileText, TbTable } from "@/components/ui/icons";
import { Ico, type Motion } from "@/components/ui/ico";

const ITEMS: { href: string; label: string; icon: typeof TbRobot; motion: Motion }[] = [
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "ring" },
  { href: "/team", label: "Team", icon: TbUsers, motion: "lift" },
  { href: "/documents", label: "Docs", icon: TbFileText, motion: "stack" },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable, motion: "scan" },
];

export function Shortcuts() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="chip group inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12.5px]"
        >
          <Ico icon={item.icon} motion={item.motion} size={14} />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
