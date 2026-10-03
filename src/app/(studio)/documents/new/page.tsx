import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DocsStudio } from "@/components/studio/docs-studio";

export const metadata = { title: "New document" };
export const dynamic = "force-dynamic";

export default async function NewDocumentPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <div className="h-full min-h-0 overflow-hidden bg-canvas">
      <DocsStudio initial={null} />
    </div>
  );
}
