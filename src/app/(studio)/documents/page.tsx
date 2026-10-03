import { currentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { DocList } from "@/components/docs/doc-list";
import { redirect } from "next/navigation";

export const metadata = { title: "Docs" };
export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const docs = await listDocuments(user.id);
  return (
    <div className="h-full min-h-0 overflow-hidden bg-canvas">
      <DocList initial={docs} />
    </div>
  );
}
