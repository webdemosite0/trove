import { BootScreen } from "@/components/auth/boot-screen";

export const metadata = { title: "Opening", robots: { index: false, follow: false } };

export default async function LaunchingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <BootScreen next={next} />;
}
