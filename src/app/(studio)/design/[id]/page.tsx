import { notFound } from "next/navigation";
import { DesignEditor } from "../editor/design-editor";
import { getDesignDoc } from "@/lib/design-docs";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Design editor" };

/** Design editor — canvas, layers, export. */
export default async function DesignEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) notFound();
  const doc = await getDesignDoc(user.id, id);
  if (!doc) notFound();
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DesignEditor doc={doc} />
    </div>
  );
}
