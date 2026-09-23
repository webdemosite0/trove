import { redirect } from "next/navigation";

export const metadata = {
  title: "Plugins & Integrations",
};

/** Plugin detail is paused — everything points at the Coming soon page. */
export default function IntegrationDetailPage() {
  redirect("/integrations");
}
