import { createClient } from "@libsql/client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = resolve(process.argv[2] || `backups/trove-${stamp}.json`);

function quoteIdentifier(name) {
  return '"' + String(name).replaceAll('"', '""') + '"';
}

function encodeValue(value) {
  if (typeof value === "bigint") {
    return { __troveType: "bigint", value: value.toString() };
  }
  if (value instanceof Uint8Array) {
    return {
      __troveType: "bytes",
      value: Buffer.from(value).toString("base64"),
    };
  }
  return value;
}

const client = createClient({ url, authToken });

try {
  const schemaResult = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );

  const tables = [];
  for (const row of schemaResult.rows) {
    const name = String(row.name || "");
    if (!name) continue;

    const result = await client.execute(`SELECT * FROM ${quoteIdentifier(name)}`);
    const rows = result.rows.map((record) => {
      const out = {};
      for (const [key, value] of Object.entries(record)) {
        out[key] = encodeValue(value);
      }
      return out;
    });

    tables.push({
      name,
      createSql: typeof row.sql === "string" ? row.sql : String(row.sql || ""),
      rowCount: rows.length,
      rows,
    });

    console.log(`✓ ${name}: ${rows.length} row(s)`);
  }

  const payload = {
    format: "trove-libsql-json-snapshot",
    version: 1,
    createdAt: new Date().toISOString(),
    source: new URL(url).hostname,
    tables,
  };

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(payload, null, 2) + "\n", {
    mode: 0o600,
  });

  console.log(`\nSnapshot written to ${output}`);
  console.log(
    "This file contains private user data. Keep it encrypted, access-controlled, and out of source control.",
  );
} finally {
  client.close();
}
