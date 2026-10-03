"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  FiCreditCard,
  FiLock,
  FiFileText,
  FiUser,
  FiX,
  FiExternalLink,
  FiDownload,
  FiShield,
  TbMessageCircle,
  TbHelpCircle,
  FiSmartphone,
  TbRobot,
} from "@/components/ui/icons";
import { IntegrationsView } from "@/components/integrations/integrations-view";
import { cn } from "@/lib/utils";
import type { User, Balance } from "@/lib/types";
import type { Profile } from "@/app/actions/profile";
import type { BusinessProfile } from "@/lib/business-profile";
import type { Subscription } from "@/lib/billing";
import { ProfileForm } from "@/components/settings/profile-form";
import { BillingPortalButton } from "@/components/settings/billing-portal-button";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { DownloadApps } from "@/components/settings/download-apps";
import { TrosPane } from "@/components/settings/tros-settings-pane";
import { SettingsIcon as AnimatedSettingsIcon, UnplugIcon } from "@/components/animate-ui/icons";

export type SettingsData = {
  profile: Profile | null;
  businessProfile: BusinessProfile | null;
  manualInstructions: string;
  subscription: Subscription | null;
};

export type SettingsSectionId =
  | "general"
  | "integrations"
  | "wallet"
  | "secure"
  | "permissions"
  | "messaging"
  | "devices"
  | "data"
  | "download"
  | "tros"
  | "help"
  | "legal";

export interface IntegrationsData {
  signedIn: boolean;
  connected: { service: string; account: string; hint: string }[];
  connectable: Record<string, { label: string; help: string; docs?: string }>;
  composioOn: boolean;
  composioServices: string[];
}

const NAV: {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "general", label: "General", icon: AnimatedSettingsIcon },
  { id: "integrations", label: "Connectors", icon: UnplugIcon },
  { id: "wallet", label: "Wallet", icon: FiCreditCard },
  { id: "secure", label: "Secure store", icon: FiShield },
  { id: "permissions", label: "Permissions", icon: FiUser },
  { id: "messaging", label: "Messaging channels", icon: TbMessageCircle },
  { id: "devices", label: "Devices", icon: FiSmartphone },
  { id: "data", label: "Data controls", icon: FiLock },
  { id: "download", label: "Download apps", icon: FiDownload },
  { id: "tros", label: "Tros", icon: TbRobot },
  { id: "help", label: "Help center", icon: TbHelpCircle },
  { id: "legal", label: "Legal info", icon: FiFileText },
];

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-raised p-5 dark:bg-raised", className)}>{children}</div>
  );
}

export function SettingsModal({
  open,
  onClose,
  user,
  balance,
  initialSection = "general",
  integrations,
  settingsData,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  balance: Balance | null;
  initialSection?: string | null;
  integrations?: IntegrationsData;
  settingsData?: SettingsData;
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

  const planName = user?.effectivePlan || user?.plan || "free";
  const granted = balance?.granted ?? 0;
  const used = balance?.used ?? 0;
  const remaining = balance?.remaining ?? 0;
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[min(720px,92dvh)] w-full max-w-[920px] overflow-hidden rounded-2xl border border-line bg-rail shadow-2xl"
      >
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-sunk/40">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 id={titleId} className="text-[14px] font-semibold text-ink">
              Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-hover hover:text-ink"
              aria-label="Close"
            >
              <FiX size={16} />
            </button>
          </div>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {NAV.map((item) => {
              const active = section === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition",
                    active
                      ? "bg-hover font-medium text-ink"
                      : "text-ink-2 hover:bg-hover/70 hover:text-ink",
                  )}
                >
                  <Icon size={16} className={active ? "text-ink" : "text-ink-3"} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <h3 className="mb-5 text-[17px] font-semibold tracking-tight">
              {NAV.find((n) => n.id === section)?.label}
            </h3>

            {section === "tros" ? <TrosPane user={user} onClose={onClose} /> : null}

            {section === "download" ? (
              <div data-theme="dark">
                <DownloadApps />
              </div>
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
                  <p className="text-[13px] text-ink-3">Loading connectors…</p>
                )}
              </div>
            ) : null}

            {section === "general" ? (
              <div className="space-y-4">
                <Card>
                  <p className="text-[15px] font-semibold">Account</p>
                  <p className="mt-1 text-[13px] text-ink-3">
                    {user?.email ?? "Signed out"} · {String(planName)} plan
                  </p>
                  {settingsData?.profile ? (
                    <div className="mt-3" data-theme="dark">
                      <ProfileForm profile={settingsData.profile} />
                    </div>
                  ) : null}
                </Card>
                <Card>
                  <p className="text-[15px] font-semibold">Usage</p>
                  <p className="mt-1 text-[13px] text-ink-3">
                    {used.toLocaleString()} / {granted.toLocaleString()} credits used
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-[#0a84ff]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-ink-4">{remaining.toLocaleString()} remaining</p>
                </Card>
              </div>
            ) : null}

            {section === "wallet" ? (
              <Card>
                <p className="text-[15px] font-semibold">Wallet</p>
                <p className="mt-1 text-[13px] text-ink-3">Plan: {String(planName)}</p>
                <div className="mt-3">
                  <BillingPortalButton className="rounded-full bg-sunk px-4 py-2 text-[13px] font-medium text-ink hover:bg-hover">
                    Manage billing
                  </BillingPortalButton>
                </div>
                <Link
                  href="/plans"
                  onClick={onClose}
                  className="mt-3 inline-flex text-[13px] font-medium text-[#0a84ff]"
                >
                  View plans
                </Link>
              </Card>
            ) : null}

            {section === "help" ? (
              <Card>
                <p className="text-[15px] font-semibold">Help center</p>
                <p className="mt-1 text-[13px] text-ink-3">
                  Guides and troubleshooting on the docs site.
                </p>
                <a
                  href="https://docs.troveai.site/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex rounded-full bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white"
                >
                  Open Help center
                </a>
              </Card>
            ) : null}

            {section === "legal" ? (
              <div className="space-y-3">
                {[
                  { href: "/terms", label: "Terms of service" },
                  { href: "/privacy", label: "Privacy policy" },
                  { href: "/security", label: "Security" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center justify-between rounded-2xl bg-raised p-5 hover:bg-sunk"
                  >
                    <span className="text-[15px] font-medium">{l.label}</span>
                    <FiExternalLink size={15} className="text-ink-4" />
                  </Link>
                ))}
              </div>
            ) : null}

            {section === "data" ? (
              <Card>
                <p className="text-[15px] font-semibold">Delete account</p>
                <div className="mt-3" data-theme="dark">
                  <DeleteAccountForm />
                </div>
              </Card>
            ) : null}

            {["secure", "permissions", "messaging", "devices"].includes(section) ? (
              <Card>
                <p className="text-[13px] text-ink-3">This section is available on your plan.</p>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
