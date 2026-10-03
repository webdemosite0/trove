import { redirect } from "next/navigation";

/** Artifacts live under the Tros product now. */
export default function ArtifactsRedirect() {
  redirect("/tros/artifacts");
}
