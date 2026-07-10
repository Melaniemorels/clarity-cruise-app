/**
 * Schema drift check: compares the Drizzle schema (source of truth in
 * src/schema/) against the live database's information_schema and fails
 * loudly (exit 1) on any disagreement.
 *
 * Catches the class of bug where a live column is renamed/missing (e.g.
 * clerk_id vs clerk_user_id) which previously caused every authenticated
 * request to 401 with no useful logs.
 *
 * Run: node lib/db/src/check-drift.ts   (requires DATABASE_URL)
 */
import { getTableConfig } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema/vyv.ts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set; cannot check schema drift.");
  process.exit(1);
}

// Map a Drizzle column's SQL type to the udt_name reported by Postgres.
function expectedUdtNames(sqlType: string): string[] {
  const t = sqlType.toLowerCase();
  if (t.endsWith("[]")) {
    // Postgres reports array types as "_<base udt>" (e.g. text[] -> _text).
    return expectedUdtNames(t.slice(0, -2)).map((u) => `_${u}`);
  }
  if (t.startsWith("uuid")) return ["uuid"];
  if (t.startsWith("text")) return ["text"];
  if (t.startsWith("boolean")) return ["bool"];
  if (t.startsWith("integer")) return ["int4"];
  if (t.startsWith("bigint")) return ["int8"];
  if (t.startsWith("smallint")) return ["int2"];
  if (t.startsWith("real")) return ["float4"];
  if (t.startsWith("double")) return ["float8"];
  if (t.startsWith("numeric") || t.startsWith("decimal")) return ["numeric"];
  if (t.startsWith("jsonb")) return ["jsonb"];
  if (t.startsWith("json")) return ["json", "jsonb"];
  if (t.startsWith("date")) return ["date"];
  if (t.startsWith("timestamp with time zone")) return ["timestamptz"];
  if (t.startsWith("timestamp")) return ["timestamp", "timestamptz"];
  if (t.startsWith("time")) return ["time", "timetz"];
  if (t.startsWith("varchar") || t.startsWith("character varying"))
    return ["varchar"];
  if (t.startsWith("serial")) return ["int4"];
  // Unknown/custom type: skip type comparison rather than false-positive.
  return [];
}

type LiveColumn = {
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
};

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query<LiveColumn>(
    `SELECT table_name, column_name, udt_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`,
  );
  await client.end();

  const liveTables = new Map<string, Map<string, LiveColumn>>();
  for (const row of rows) {
    let cols = liveTables.get(row.table_name);
    if (!cols) {
      cols = new Map();
      liveTables.set(row.table_name, cols);
    }
    cols.set(row.column_name, row);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const schemaTableNames = new Set<string>();

  for (const value of Object.values(schema)) {
    let config;
    try {
      config = getTableConfig(value as never);
    } catch {
      continue; // not a pgTable export (e.g. vyvTables registry, types)
    }
    const tableName = config.name;
    if (schemaTableNames.has(tableName)) continue;
    schemaTableNames.add(tableName);

    const liveCols = liveTables.get(tableName);
    if (!liveCols) {
      errors.push(
        `Table "${tableName}" is defined in the Drizzle schema but does not exist in the database.`,
      );
      continue;
    }

    const schemaColNames = new Set<string>();
    for (const col of config.columns) {
      schemaColNames.add(col.name);
      const live = liveCols.get(col.name);
      if (!live) {
        errors.push(
          `Column "${tableName}.${col.name}" is defined in the Drizzle schema but missing in the database.`,
        );
        continue;
      }
      const expected = expectedUdtNames(col.getSQLType());
      if (expected.length > 0 && !expected.includes(live.udt_name)) {
        errors.push(
          `Column "${tableName}.${col.name}" type mismatch: schema says "${col.getSQLType()}" but database has "${live.udt_name}".`,
        );
      }
      const schemaNullable = !col.notNull;
      const liveNullable = live.is_nullable === "YES";
      if (schemaNullable !== liveNullable) {
        errors.push(
          `Column "${tableName}.${col.name}" nullability mismatch: schema says ${schemaNullable ? "NULLABLE" : "NOT NULL"} but database says ${liveNullable ? "NULLABLE" : "NOT NULL"}.`,
        );
      }
    }

    for (const liveColName of liveCols.keys()) {
      if (!schemaColNames.has(liveColName)) {
        errors.push(
          `Column "${tableName}.${liveColName}" exists in the database but is not in the Drizzle schema (possible rename drift).`,
        );
      }
    }
  }

  for (const liveTableName of liveTables.keys()) {
    if (!schemaTableNames.has(liveTableName)) {
      warnings.push(
        `Table "${liveTableName}" exists in the database but is not in the Drizzle schema (legacy/unmanaged table — ignored).`,
      );
    }
  }

  if (warnings.length > 0) {
    console.warn(`Schema drift check: ${warnings.length} warning(s):`);
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (errors.length > 0) {
    console.error(
      `\nSCHEMA DRIFT DETECTED — the Drizzle schema (lib/db/src/schema/) and the live database disagree (${errors.length} error(s)):`,
    );
    for (const e of errors) console.error(`  - ${e}`);
    console.error(
      `\nFix: reconcile with an in-place migration (prefer ALTER TABLE ... RENAME COLUMN for renames to preserve data), or update the schema file, then re-run this check.`,
    );
    process.exit(1);
  }

  console.log(
    `Schema drift check passed: ${schemaTableNames.size} tables match the live database.`,
  );
}

main().catch((err) => {
  console.error("Schema drift check failed to run:", err);
  process.exit(1);
});
