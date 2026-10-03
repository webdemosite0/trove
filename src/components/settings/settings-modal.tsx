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
  FiLogOut,
  FiCheck,
  FiExternalLink,
  FiDownload,
  TbMessageCircle,
  TbHelpCircle,
  FiSmartphone,
  TbRobot,
} from "@/components/ui/icons";
import { IntegrationsView } from "@/components/integrations/integrations-view";
import { useTheme } from "@/components/shell/theme";
import { logOut } from "@/app/actions/auth";
import { userHasTrosAccess } from "@/lib/tros-access";
import { cn } from "@/lib/utils";
import type { User, Balance } from "@/lib/types";
import type { Profile } from "@/app/actions/profile";
import type { BusinessProfile } from "@/lib/business-profile";
import type { Subscription } from "@/lib/billing";
import { ProfileForm } from "@/components/settings/profile-form";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { InstructionsForm } from "@/components/settings/instructions-form";
import { BillingPortalButton } from "@/components/settings/billing-portal-button";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { DownloadApps } from "@/components/settings/download-apps";
import { SettingsIcon as AnimatedSettingsIcon, UnplugIcon } from "@/components/animate-ui/icons";

/** Everything the overlay needs that the old /settings pages used to fetch. */
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

/** Data for the inline Connectors section (fetched server-side in the shell layout). */
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

export { SettingsModal } from "./settings-modal-impl";
