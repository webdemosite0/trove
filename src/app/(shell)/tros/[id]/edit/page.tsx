import { redirect } from "next/navigation";

export const metadata = { title: "Edit Tro" };
export const dynamic = "force-dynamic";

export default async function EditTroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tros/${id}`);
}
