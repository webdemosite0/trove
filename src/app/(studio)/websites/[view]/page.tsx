import { redirect } from "next/navigation";

export default function Gone() {
  redirect("/chat");
}
