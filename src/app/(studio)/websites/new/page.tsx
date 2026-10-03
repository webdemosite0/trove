import { SiteBuilder } from "@/components/websites/site-builder";

export const metadata = { title: "New website" };

export default function NewWebsitePage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SiteBuilder />
    </div>
  );
}
