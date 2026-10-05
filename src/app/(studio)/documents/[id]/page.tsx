import { redirect } from "next/navigation";
import Link from "next/link";
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
  if (!doc) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-canvas px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-[20px] font-bold text-ink">Document not found</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
            This document doesn&apos;t exist or you don&apos;t have access to
            it. It may have been deleted.
          </p>
          <Link
            href="/documents"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition active:scale-95"
          >
            Back to documents
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden bg-canvas">
      <DocsStudio initial={doc} />
    </div>
  );
}
