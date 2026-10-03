import { DesignGallery } from "./design-gallery";
import { listDesignDocs } from "@/lib/design-docs";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Design" };

/** Design — Canva-style gallery of the user's designs. */
export default async function DesignPage() {
  const user = await currentUser();
  const docs = user ? await listDesignDocs(user.id) : [];
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <DesignGallery docs={docs} />
    </div>
  );
}
