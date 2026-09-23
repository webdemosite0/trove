import { redirect } from "next/navigation";

export const metadata = { title: "Chat" };

export default function CodeGone() {
  redirect("/chat");
}
