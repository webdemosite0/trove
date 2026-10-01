"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  FiSettings,
  FiGrid,
  FiCreditCard,
  FiShield,
  FiLock,
  FiFileText,
  FiUser,
  FiSun,
  FiMoon,
  FiMonitor,
  FiX,
  FiChevronRight,
  FiLogOut,
  FiCheck,
  FiExternalLink,
  TbMessageCircle,
  TbHelpCircle,
  FiSmartphone,
} from "@/components/ui/icons";
import { IntegrationsView } from "@/app/(shell)/integrations/integrations-view";
import { useTheme } from "@/components/shell/theme";
import { logOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { User, Balance } from "@/lib/types";

export type SettingsSectionId =
  | "general"
  | "integrations"
  | "wallet"
  | "secure"
  | "permissions"
  | "messaging"
  | "devices"
  | "data"
  | "help"
  | "legal";

/** Data for the inline Connectors section (fetched server-side in the shell layout). */
export interface IntegrationsData {
  signedIn: boolean;
  connected: { service: string; account: string; hint: string }[];
  connectable: Record<string, { label: string; help: string; docs?: string }>;
  composioOn: boolean;
  composioServices: string[];
}

const NAV: { id: SettingsSectionId; label: string; icon: typeof FiSettings }[] = [
  { id: "general", label: "General", icon: FiSettings },
  { id: "integrations", label: "Connectors", icon: FiGrid },
  { id: "wallet", label: "Wallet", icon: FiCreditCard },
  { id: "secure", label: "Secure store", icon: FiShield },
  { id: "permissions", label: "Permissions", icon: FiUser },
  { id: "messaging", label: "Messaging channels", icon: TbMessageCircle },
  { id: "devices", label: "Devices", icon: FiSmartphone },
  { id: "data", label: "Data controls", icon: FiLock },
  { id: "help", label: "Help & support", icon: TbHelpCircle },
  { id: "legal", label: "Legal info", icon: FiFileText },
];

/* ---------------------------------- theme color ---------------------------------- */

const ACCENT_KEY = "trove-accent";
const ACCENTS = [
  { name: "Default", value: "" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Red", value: "#ef4444" },
];

function useAccent(): [string, (v: string) => void] {
  const [accent, setAccentState] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_KEY) || "";
      setAccentState(saved);
      if (saved) document.documentElement.style.setProperty("--color-accent", saved);
    } catch {
      /* ignore */
    }
  }, []);
  const setAccent = useCallback((v: string) => {
    setAccentState(v);
    try {
      if (v) {
        localStorage.setItem(ACCENT_KEY, v);
        document.documentElement.style.setProperty("--color-accent", v);
      } else {
        localStorage.removeItem(ACCENT_KEY);
        document.documentElement.style.removeProperty("--color-accent");
      }
    } catch {
      /* ignore */
    }
  }, []);
  return [accent, setAccent];
}

/* ---------------------------------- primitives ---------------------------------- */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white/[0.045] p-5 dark:bg-white/[0.045]", className)}>{children}</div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 mt-7 text-[13px] font-medium text-ink-3 first:mt-0">{children}</p>;
}

function UsageBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-[#0a84ff] transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/* ---------------------------------- modal ---------------------------------- */

/** Floating settings dialog — Muse-style overlay, separate from the page. */
export function SettingsModal({
  open,
  onClose,
  user,
  balance,
  initialSection = "general",
  integrations,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  balance: Balance | null;
  initialSection?: string | null;
  integrations?: IntegrationsData;
}) {
  const titleId = useId();
  const validSection = (s: string | null | undefined): SettingsSectionId =>
    (NAV.some((n) => n.id === s) ? s : "general") as SettingsSectionId;
  const [section, setSection] = useState<SettingsSectionId>(validSection(initialSection));

  useEffect(() => {
    if (open) setSection(validSection(initialSection));
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
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[min(720px,calc(100dvh-3rem))] w-full max-w-[980px] overflow-hidden rounded-[20px] bg-[#1e1e20] text-[#f2f2f5] shadow-[0_32px_80px_-16px_rgb(0_0_0/0.7)] dark:bg-[#1e1e20] dark:text-[#f2f2f5]"
        style={{ colorScheme: "dark" }}
      >
        {/* Left nav */}
        <aside className="flex w-[248px] shrink-0 flex-col bg-black/20">
          <h2 id={titleId} className="px-5 pb-3 pt-5 text-[17px] font-semibold tracking-tight">
            Settings
          </h2>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
            {NAV.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] transition-colors",
                    active
                      ? "bg-white/[0.09] font-medium text-white"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <item.icon size={17} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <form action={logOut} className="border-t border-white/10 p-3">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <FiLogOut size={17} className="shrink-0" />
              Log out
            </button>
          </form>
        </aside>

        {/* Right content */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full bg-white/[0.07] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            <FiX size={16} />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <h3 className="mb-5 text-[17px] font-semibold tracking-tight">
              {NAV.find((n) => n.id === section)?.label}
            </h3>

            {section === "general" ? (
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

            {section === "integrations" ? (
              <div data-theme="dark" className="rounded-2xl">
                {integrations ? (
                  <IntegrationsView
                    bare
                    signedIn={integrations.signedIn}
                    connected={integrations.connected}
                    connectable={integrations.connectable}
                    composioOn={integrations.composioOn}
                    composioServices={integrations.composioServices}
                  />
                ) : (
                  <p className="text-[13px] text-white/50">Loading connectors…</p>
                )}
              </div>
            ) : null}

            {section === "wallet" ? (
              <WalletPane planName={String(planName)} pct={pct} remaining={remaining} onClose={onClose} />
            ) : null}

            {section === "secure" ? <SecurePane /> : null}
            {section === "permissions" ? <PermissionsPane /> : null}
            {section === "messaging" ? <MessagingPane /> : null}
            {section === "devices" ? <DevicesPane /> : null}
            {section === "data" ? <DataPane onClose={onClose} /> : null}
            {section === "help" ? <HelpPane /> : null}
            {section === "legal" ? <LegalPane /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- panes ---------------------------------- */

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
  const [theme, setTheme] = useTheme();
  const [accent, setAccent] = useAccent();
  const name = user?.name?.trim() || "Account";
  const resetDate = "Oct 5";

  return (
    <div>
      {/* Account card */}
      <Link
        href="/settings/account"
        onClick={onClose}
        className="flex items-center gap-4 rounded-2xl bg-white/[0.045] p-5 transition-colors hover:bg-white/[0.07]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[20px] font-light">
          ∞
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Trove Account</span>
          <span className="block text-[13px] text-white/50">Password, security, personal details</span>
        </span>
        <FiExternalLink size={15} className="shrink-0 text-white/40" />
      </Link>

      <SectionLabel>Usage</SectionLabel>
      <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">{planName} plan</p>
          <p className="text-[13px] text-white/50">{pct}% used</p>
        </div>
        <p className="mt-0.5 text-[13px] text-white/50">Weekly limit resets on {resetDate}</p>
        <UsageBar pct={pct} />

        <div className="mt-5 flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">Additional tokens</p>
          <p className="text-[13px] text-white/50">
            0% used ({remaining > 0 ? `${remaining.toLocaleString()} tokens left` : "no tokens left"})
          </p>
        </div>
        <p className="mt-0.5 text-[13px] text-white/50">Never expires</p>
        <UsageBar pct={0} />

        <div className="mt-4 border-t border-white/10 pt-3">
          <Link href="/plans" onClick={onClose} className="text-[14px] font-medium text-[#0a84ff] hover:underline">
            Upgrade
          </Link>
        </div>
      </Card>

      <div className="mt-4">
        <Link
          href="/settings/account"
          onClick={onClose}
          className="flex items-center justify-between rounded-2xl bg-white/[0.045] p-5 transition-colors hover:bg-white/[0.07]"
        >
          <span className="text-[15px] font-medium">Language</span>
          <FiChevronRight size={16} className="text-white/40" />
        </Link>
      </div>

      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium">Mode</p>
          <div className="flex rounded-full bg-white/[0.07] p-1">
            {(
              [
                { value: "light", icon: FiSun, label: "Light" },
                { value: "dark", icon: FiMoon, label: "Dark" },
                { value: "system", icon: FiMonitor, label: "System" },
              ] as const
            ).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTheme(o.value)}
                aria-label={o.label}
                title={o.label}
                className={cn(
                  "grid size-9 place-items-center rounded-full transition-colors",
                  theme === o.value ? "bg-white/[0.14] text-white" : "text-white/45 hover:text-white/70",
                )}
              >
                <o.icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-3 text-[15px] font-medium">Theme color</p>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => {
              const active = (accent || "") === a.value;
              return (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setAccent(a.value)}
                  title={a.name}
                  aria-label={`Theme color ${a.name}`}
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-transform hover:scale-110",
                    active && "ring-2 ring-white ring-offset-2 ring-offset-[#1e1e20]",
                  )}
                  style={{ background: a.value || "conic-gradient(#3b82f6,#8b5cf6,#ec4899,#f97316,#22c55e,#3b82f6)" }}
                >
                  {active ? <FiCheck size={14} className="text-white drop-shadow" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <p className="mt-6 text-[12.5px] text-white/35">
        Signed in as {name}
        {user?.email ? ` · ${user.email}` : ""}.
      </p>
    </div>
  );
}

function WalletPane({
  planName,
  pct,
  remaining,
  onClose,
}: {
  planName: string;
  pct: number;
  remaining: number;
  onClose: () => void;
}) {
  return (
    <div>
      <SectionLabel>Current plan</SectionLabel>
      <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-semibold">{planName}</p>
          <p className="text-[13px] text-white/50">{pct}% used</p>
        </div>
        <UsageBar pct={pct} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/plans"
            onClick={onClose}
            className="rounded-full bg-[#0a84ff] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:brightness-110"
          >
            Upgrade plan
          </Link>
          <Link
            href="/settings/billing"
            onClick={onClose}
            className="rounded-full bg-white/[0.07] px-4 py-2 text-[13.5px] font-medium text-white transition hover:bg-white/[0.12]"
          >
            Billing details
          </Link>
        </div>
      </Card>

      <SectionLabel>Payment</SectionLabel>
      <Link
        href="/settings/payment-methods"
        onClick={onClose}
        className="flex items-center justify-between rounded-2xl bg-white/[0.045] p-5 transition-colors hover:bg-white/[0.07]"
      >
        <span>
          <span className="block text-[15px] font-medium">Payment methods</span>
          <span className="block text-[13px] text-white/50">Cards and billing info</span>
        </span>
        <FiChevronRight size={16} className="text-white/40" />
      </Link>
      <p className="mt-4 text-[12.5px] text-white/35">
        {remaining.toLocaleString()} credits remaining this period.
      </p>
    </div>
  );
}

function SecurePane() {
  return (
    <div>
      <SectionLabel>Secure store</SectionLabel>
      <Card>
        <p className="text-[15px] font-semibold">Credentials vault</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
          API keys and integration secrets are encrypted at rest and never shown in plain text —
          not even to Trove support. They are only decrypted in memory when an integration needs them.
        </p>
      </Card>
      <Card className="mt-3">
        <p className="text-[15px] font-semibold">Sessions</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
          Sign-in sessions are opaque tokens stored securely. Signing out on a device revokes its
          session immediately.
        </p>
      </Card>
    </div>
  );
}

function PermissionsPane() {
  const [notif, setNotif] = useState<string>("unknown");
  useEffect(() => {
    try {
      setNotif(Notification.permission);
    } catch {
      setNotif("unsupported");
    }
  }, []);
  return (
    <div>
      <SectionLabel>Permissions</SectionLabel>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-medium">Notifications</p>
            <p className="text-[13px] text-white/50">
              {notif === "granted" ? "Allowed" : notif === "denied" ? "Blocked" : "Not asked yet"}
            </p>
          </div>
          {notif !== "granted" ? (
            <button
              type="button"
              onClick={() => {
                try {
                  Notification.requestPermission().then((p) => setNotif(p));
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-full bg-white/[0.07] px-4 py-2 text-[13px] font-medium transition hover:bg-white/[0.12]"
            >
              Enable
            </button>
          ) : null}
        </div>
      </Card>
      <p className="mt-4 text-[12.5px] leading-relaxed text-white/35">
        Trove only asks for what a feature needs — camera, microphone, and location are requested
        in context, never up front.
      </p>
    </div>
  );
}

function MessagingPane() {
  return (
    <div>
      <SectionLabel>Messaging channels</SectionLabel>
      <Card>
        <p className="text-[15px] font-semibold">WhatsApp</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
          Chat with Muse from WhatsApp. Connection is managed in the Muse app under
          Chat connections.
        </p>
      </Card>
    </div>
  );
}

function DevicesPane() {
  return (
    <div>
      <SectionLabel>Devices</SectionLabel>
      <Card>
        <p className="text-[15px] font-semibold">This device</p>
        <p className="mt-1.5 text-[13.5px] text-white/55">Signed in via the web app.</p>
      </Card>
      <p className="mt-4 text-[12.5px] leading-relaxed text-white/35">
        Pair your phone from the Muse app to sync health data, location, and messages.
      </p>
    </div>
  );
}

function DataPane({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <SectionLabel>Data controls</SectionLabel>
      <Card>
        <p className="text-[15px] font-semibold">Export your data</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
          Download everything Trove stores about you — chats, artifacts, projects, and settings.
        </p>
        <Link
          href="/settings/download"
          onClick={onClose}
          className="mt-3 inline-block rounded-full bg-white/[0.07] px-4 py-2 text-[13px] font-medium transition hover:bg-white/[0.12]"
        >
          Export data
        </Link>
      </Card>
      <Card className="mt-3">
        <p className="text-[15px] font-semibold">Delete account</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">
          Permanently remove your account and all associated data. This cannot be undone.
        </p>
        <Link
          href="/settings/account"
          onClick={onClose}
          className="mt-3 inline-block rounded-full bg-red-500/15 px-4 py-2 text-[13px] font-medium text-red-400 transition hover:bg-red-500/25"
        >
          Manage in Account
        </Link>
      </Card>
    </div>
  );
}

function HelpPane() {
  return (
    <div>
      <SectionLabel>Help & support</SectionLabel>
      <div className="space-y-3">
        {[
          { title: "Something is not working", body: "Refresh once, retry the action, then tell us the page you were on and what you clicked." },
          { title: "Billing or plan", body: "Check Wallet first. If a payment succeeded but your plan did not update, contact support with the payment time." },
          { title: "Account access", body: "Use Account settings for sign-in issues. Never send passwords or API keys to support." },
        ].map((c) => (
          <Card key={c.title}>
            <p className="text-[15px] font-semibold">{c.title}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">{c.body}</p>
          </Card>
        ))}
      </div>
      <a
        href="mailto:official@troveai.site?subject=Trove%20support"
        className="mt-4 inline-block rounded-full bg-[#0a84ff] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:brightness-110"
      >
        Contact support
      </a>
    </div>
  );
}

function LegalPane() {
  return (
    <div>
      <SectionLabel>Legal info</SectionLabel>
      <div className="space-y-3">
        {[
          { title: "Terms of service", href: "/terms" },
          { title: "Privacy policy", href: "/privacy" },
          { title: "Security", href: "/security" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center justify-between rounded-2xl bg-white/[0.045] p-5 transition-colors hover:bg-white/[0.07]"
          >
            <span className="text-[15px] font-medium">{l.title}</span>
            <FiExternalLink size={15} className="text-white/40" />
          </Link>
        ))}
      </div>
    </div>
  );
}
