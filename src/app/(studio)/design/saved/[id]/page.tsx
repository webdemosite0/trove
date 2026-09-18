import { redirect } from "next/navigation";

export default async function LegacySavedDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/design/${encodeURIComponent(id)}`);
}
