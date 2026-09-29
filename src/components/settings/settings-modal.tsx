"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  FiSettings,
  FiUser,
  FiSun,
  FiActivity,
  FiCreditCard,
  FiGrid,
  FiLogOut,
  FiX,
  FiChevronRight,
  FiHelpCircle,
} from "@/components/ui/icons";
import { ThemePicker } from "@/components/settings/theme-picker";
import { logOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { User, Balance } from "@/lib/types";

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "usage"
  | "integrations"
  | "plan"
  | "account"
  | "help";

const NAV: {
  id: SettingsSectionId;
  label: string;
  icon: typeof FiSettings;
  external?: string;
}[] = [
  { id: "general", label: "General", icon: FiSettings },
  { id: "account", label: "Account", icon: FiUser },
  { id: "appearance", label: "Appearance", icon: FiSun },
  { id: "usage", label: "Usage", icon: FiActivity },
  { id: "plan", label: "Plan & billing", icon: FiCreditCard, external: "/plans" },
  { id: "integrations", label: "Connectors", icon: FiGrid, external: "/integrations" },
  { id: "help", label: "Help & support", icon: FiHelpCircle, external: "/security" },
];

/** Floating settings dialog — Meta-style overlay, not a separate page. */
export function SettingsModal({
  open,
  onClose,
  user,
  balance,
  initialSection = "general",
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  balance: Balance | null;
  initialSection?: SettingsSectionId;
}) {
  const titleId = useId();
  const [section, setSection] = useState<SettingsSectionId>(initialSection);

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const planName = balance?.plan?.name ?? user?.plan ?? "Free";
  const granted = balance?.granted ?? 0;
  const used = balance?.used ?? 0;
  const remaining = balance?.remaining ?? 0;
  const pct =
    granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[min(640px,calc(100dvh-2rem))] w-full max-w-[820px] overflow-hidden rounded-[18px] border border-line bg-raised shadow-[var(--elev-lift,0_24px_64px_-16px_rgb(0_0_0/0.55))]"
      >
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-rail sm:w-[220px]">
          <div className="flex items-center gap-2 px-4 pb-2 pt-4">
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-ink">
              Settings
            </h2>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
            {NAV.map((item) => {
              const active = section === item.id;
              if (item.external) {
                return (
                  <Link
                    key={item.id}
                    href={item.external}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-colors",
                      "text-ink-3 hover:bg-hover hover:text-ink",
                    )}
                  >
                    <item.icon size={15} className="shrink-0 text-ink-4" />
                    <span className="truncate">{item.label}</span>
                    <FiChevronRight size={13} className="ml-auto shrink-0 text-ink-4" />
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors",
                    active
                      ? "bg-hover font-medium text-ink"
                      : "text-ink-3 hover:bg-hover hover:text-ink",
                  )}
                >
                  <item.icon
                    size={15}
                    className={cn("shrink-0", active ? "text-accent" : "text-ink-4")}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <form action={logOut} className="border-t border-line p-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <FiLogOut size={15} className="shrink-0 text-ink-4" />
              Log out
            </button>
          </form>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col bg-canvas">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <FiX size={16} />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {section === "general" || section === "account" ? (
              <GeneralPane
                user={user}
                planName={String(planName)}
                pct={pct}
                used={used}
                granted={granted}
                remaining={remaining}
                onClose={onClose}
              />
            ) : null}
            {section === "appearance" ? (
              <div className="pr-6">
                <h3 className="mb-4 text-[16px] font-semibold text-ink">Appearance</h3>
                <ThemePicker />
              </div>
            ) : null}
            {section === "usage" ? (
              <UsagePane
                planName={String(planName)}
                pct={pct}
                used={used}
                granted={granted}
                remaining={remaining}
                onClose={onClose}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RowLink({
  href,
  title,
  subtitle,
  onClick,
}: {
  href: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-[12px] bg-sunk/80 px-3.5 py-3 transition-colors hover:bg-hover"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] text-ink-3">{subtitle}</p>
      </div>
      <FiChevronRight size={15} className="shrink-0 text-ink-4" />
    </Link>
  );
}

function GeneralPane({
  user,
  planName,
  pct,
  used,
  granted,
  remaining,
  onClose,
}: {
  user: User | null;
  planName: string;
  pct: number;
  used: number;
  granted: number;
  remaining: number;
  onClose: () => void;
}) {
  const name = user?.name?.trim() || "Account";
  const email = user?.email || "";

  return (
    <div className="space-y-5 pr-6">
      <h3 className="text-[16px] font-semibold text-ink">General</h3>

      <RowLink
        href="/settings"
        title={name}
        subtitle={email ? `${email} · Password, security, personal details` : "Password, security, personal details"}
        onClick={onClose}
      />

      <div>
        <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.04em] text-ink-4">
          Usage
        </p>
        <div className="rounded-[12px] bg-sunk/80 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-medium text-ink">{planName} plan</p>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {remaining.toLocaleString()} credits left
                {granted > 0 ? ` of ${granted.toLocaleString()}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-ink-3">
              {pct}% used
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-hover"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-3">
              {used.toLocaleString()} used this period
            </span>
            <Link
              href="/plans"
              onClick={onClose}
              className="text-[12.5px] font-medium text-accent hover:underline"
            >
              Upgrade
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <RowLink
          href="/settings/appearance"
          title="Appearance"
          subtitle="Theme and display"
          onClick={onClose}
        />
        <RowLink
          href="/settings/usage"
          title="Usage details"
          subtitle="Charts and credit breakdown"
          onClick={onClose}
        />
      </div>
    </div>
  );
}

function UsagePane({
  planName,
  pct,
  used,
  granted,
  remaining,
  onClose,
}: {
  planName: string;
  pct: number;
  used: number;
  granted: number;
  remaining: number;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5 pr-6">
      <h3 className="text-[16px] font-semibold text-ink">Usage</h3>
      <div className="rounded-[12px] bg-sunk/80 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13.5px] font-medium text-ink">{planName} plan</p>
          <span className="text-[12px] tabular-nums text-ink-3">{pct}% used</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hover">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-[13px] text-ink-2">
          <span className="font-semibold tabular-nums text-ink">
            {remaining.toLocaleString()}
          </span>{" "}
          remaining
          {granted > 0 ? (
            <span className="text-ink-3">
              {" "}
              · {used.toLocaleString()} / {granted.toLocaleString()} used
            </span>
          ) : null}
        </p>
        <Link
          href="/settings/usage"
          onClick={onClose}
          className="mt-3 inline-flex text-[12.5px] font-medium text-accent hover:underline"
        >
          View full usage →
        </Link>
      </div>
      <RowLink
        href="/plans"
        title="Plan & billing"
        subtitle="Upgrade or manage your subscription"
        onClick={onClose}
      />
    </div>
  );
}
