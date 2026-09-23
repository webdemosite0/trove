import { ComingSoon } from "@/components/ui/coming-soon";
import { TbPlugConnected } from "@/components/ui/icons";

export const metadata = {
  title: "Plugins & Integrations",
  description: "Connect your tools to Trove — coming soon.",
};

export default function IntegrationsPage() {
  return (
    <ComingSoon
      title="Plugins & integrations"
      blurb="Connect Slack, Google, Notion, and more so Trove can use your tools in chat. We're polishing this surface — it will land here soon."
      icon={TbPlugConnected}
      motion="ring"
      tint="#10b981"
      points={[
        "One-click connect for popular apps",
        "Use tools directly from chat and agents",
        "Secure OAuth — your keys stay private",
      ]}
    />
  );
}
