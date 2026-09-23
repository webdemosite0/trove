export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReleaseAsset = {
  name?: string;
  browser_download_url?: string;
};

type Release = {
  tag_name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  assets?: ReleaseAsset[];
};

function assetUrl(assets: ReleaseAsset[], pattern: RegExp) {
  return (
    assets.find(
      (asset) =>
        typeof asset.name === "string" &&
        pattern.test(asset.name) &&
        typeof asset.browser_download_url === "string",
    )?.browser_download_url ?? null
  );
}

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/webdemosite0/trove/releases?per_page=20",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Trove-Download-Resolver",
        },
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      return Response.json(
        { available: false, reason: "release_lookup_failed" },
        { headers: { "Cache-Control": "public, max-age=60" } },
      );
    }

    const releases = (await res.json()) as Release[];
    const release = releases.find(
      (item) =>
        !item.draft &&
        String(item.tag_name || "").startsWith("desktop-") &&
        Array.isArray(item.assets),
    );

    if (!release) {
      return Response.json(
        { available: false, reason: "release_building" },
        { headers: { "Cache-Control": "public, max-age=60" } },
      );
    }

    const assets = release.assets ?? [];
    const downloads = {
      windows: assetUrl(assets, /\.exe$/i),
      macos: assetUrl(assets, /\.dmg$/i),
      linux: assetUrl(assets, /\.AppImage$/i),
    };

    return Response.json(
      {
        available: Boolean(downloads.windows || downloads.macos || downloads.linux),
        tag: release.tag_name ?? "",
        publishedAt: release.published_at ?? "",
        releaseUrl: release.html_url ?? "https://github.com/webdemosite0/trove/releases",
        downloads,
      },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json(
      { available: false, reason: "release_lookup_failed" },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }
}
