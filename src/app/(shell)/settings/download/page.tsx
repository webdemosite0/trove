import type { Metadata } from "next";
import { DownloadApps } from "@/components/settings/download-apps";

export const metadata: Metadata = {
  title: "Download Trove",
  description: "Install Trove on Windows, macOS, Android, or iOS.",
};

export default function DownloadSettingsPage() {
  return <DownloadApps />;
}
