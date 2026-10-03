import { WebsitesStudio } from "@/components/studio/websites-studio";

export const metadata = { title: "New website" };

export default function NewWebsitePage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <WebsitesStudio />
    </div>
  );
}
