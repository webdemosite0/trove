import { BuilderView } from "./builder-view";

export const metadata = { title: "Websites" };

export default function WebsitesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <BuilderView />
    </div>
  );
}
