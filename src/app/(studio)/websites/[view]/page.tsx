import { redirect } from "next/navigation";

/** AI web builder is temporarily disabled. */
export default function DisabledWebBuilderPage() {
  redirect("/dashboard");
}
