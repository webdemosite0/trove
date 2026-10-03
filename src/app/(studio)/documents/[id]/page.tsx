import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { DocsStudio } from "@/components/studio/docs-studio";

export const metadata = { title: "Document" };
export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const doc = await getDocument(user.id, id);
  if (!doc) notFound();
  return (
    <div className="h-full min-h-0 overflow-hidden bg-canvas">
      <DocsStudio initial={doc} />
    </div>
  );
}
