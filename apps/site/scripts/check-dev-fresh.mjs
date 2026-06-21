#!/usr/bin/env node
/**
 * Verify the local dev server is serving the expected bundle (not a stale process).
 * Usage: pnpm run check:dev  (server must already be running on SITE_DEV_PORT)
 */
const port = Number(process.env.SITE_DEV_PORT ?? 4322);
const base = `http://127.0.0.1:${port}`;

const routes = [
  {
    path: "/",
    mustInclude: [
      'data-splash-ambient-draft="paper-fog"',
      'data-splash-ambient-ready="still"',
      "data-dev-build",
    ],
    mustExclude: ["data-splash-field-canvas", "data-splash-field"],
  },
];

let failed = false;

for (const route of routes) {
  const url = `${base}${route.path}`;
  let res;
  let html;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });
    html = await res.text();
  } catch (error) {
    console.error(`FAIL ${url}\n  ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
    continue;
  }

  const build = html.match(/data-dev-build="([^"]+)"/)?.[1] ?? "(missing)";
  const problems = [];

  if (!res.ok) problems.push(`HTTP ${res.status}`);
  for (const token of route.mustInclude) {
    if (!html.includes(token)) problems.push(`missing ${token}`);
  }
  for (const token of route.mustExclude) {
    if (html.includes(token)) problems.push(`stale token present: ${token}`);
  }

  if (problems.length > 0) {
    console.error(`FAIL ${url}  build=${build}`);
    for (const p of problems) console.error(`  - ${p}`);
    failed = true;
  } else {
    console.log(`OK   ${url}  build=${build}`);
  }
}

if (failed) {
  console.error("\nStale or wrong dev bundle. Run: pnpm run dev:fresh");
  process.exit(1);
}
