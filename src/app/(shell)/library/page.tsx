import { redirect } from "next/navigation";

export const metadata = { title: "Library" };

/** The library now lives with the Tros — every artifact belongs to a Tro. */
export default function LibraryPage() {
  redirect("/artifacts");
}
