const base = String(
  process.argv[2] || process.env.LAUNCH_URL || process.env.SITE_URL || "https://troveai.site",
)
  .trim()
  .replace(/\/$/, "");

const checks = [
  ["/", [200]],
  ["/pricing", [200]],
  ["/features", [200]],
  ["/privacy", [200]],
  ["/terms", [200]],
  ["/security", [200]],
  ["/status", [200]],
  ["/login", [200]],
  ["/signup", [200]],
  ["/forgot-password", [200]],
  ["/.well-known/security.txt", [200]],
];

async function get(path) {
  const response = await fetch(base + path, {
    redirect: "manual",
    headers: { "user-agent": "TroveLaunchReadiness/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  return response;
}

let failed = false;

console.log(`Checking Trove launch readiness at ${base}\n`);

for (const [path, expected] of checks) {
  try {
    const response = await get(path);
    const ok = expected.includes(response.status);
    console.log(`${ok ? "✓" : "✗"} ${path} — HTTP ${response.status}`);
    if (!ok) failed = true;

    if (path === "/") {
      const requiredHeaders = [
        "x-content-type-options",
        "referrer-policy",
        "x-frame-options",
        "permissions-policy",
        "strict-transport-security",
      ];
      for (const header of requiredHeaders) {
        const value = response.headers.get(header);
        const present = Boolean(value);
        console.log(`  ${present ? "✓" : "✗"} header ${header}${value ? `: ${value}` : ""}`);
        if (!present) failed = true;
      }
    }
  } catch (error) {
    failed = true;
    console.log(`✗ ${path} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

let ready = false;
try {
  const response = await fetch(base + "/api/health", {
    headers: { "user-agent": "TroveLaunchReadiness/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  const health = await response.json();
  console.log(`\nHealth endpoint: HTTP ${response.status}, ok=${Boolean(health?.ok)}`);

  const launch = health?.launchReadiness;
  ready = launch?.readyForGlobalPaidLaunch === true;
  if (ready) {
    console.log("✓ Global paid launch configuration is ready.");
  } else {
    console.log("✗ Global paid launch configuration is not complete.");
    for (const item of launch?.missing || []) console.log(`  - ${item}`);
  }

  if (!response.ok || health?.ok !== true) failed = true;
} catch (error) {
  failed = true;
  console.log(
    `\n✗ /api/health — ${error instanceof Error ? error.message : String(error)}`,
  );
}

console.log("");
if (failed) {
  console.error("Public launch smoke checks failed.");
  process.exit(1);
}
if (!ready) {
  console.error("App is operational, but global paid launch configuration is incomplete.");
  process.exit(2);
}

console.log("All launch checks passed.");
