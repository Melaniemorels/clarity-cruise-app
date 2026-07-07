// PostgREST-compatibility shim for the handful of imported hooks that still
// call `${VITE_SUPABASE_URL}/rest/v1/<table>?...` directly instead of going
// through the supabase client shim. Supports the subset actually used by the
// frontend: eq filters, `select=`, POST inserts (with Prefer
// merge-duplicates / ignore-duplicates), PATCH updates and DELETE.
//
// All tables reachable here hold strictly personal rows, so every operation
// (reads included) is force-scoped to the authenticated user.
import { Router, type IRouter, type Request, type Response } from "express";
import { db, vyvTables } from "@workspace/db";
import { and, eq, getTableColumns, type SQL } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// Only the tables the direct-fetch hooks actually touch.
const REST_TABLES = new Set([
  "media_integrations",
  "media_consent",
  "recommendation_feedback",
  "seen_items",
]);

function getTable(name: string) {
  if (!REST_TABLES.has(name)) return undefined;
  return (vyvTables as Record<string, any>)[name];
}

function coerce(col: any, raw: string): unknown {
  if (raw === "null") return null;
  const dt = String(col?.dataType ?? "");
  if (dt === "boolean") return raw === "true";
  if (dt === "number") return Number(raw);
  return raw;
}

/**
 * Parse `?col=eq.value` style filters. Only `eq.` is supported (the only
 * operator the frontend uses). `select`, `order`, `limit`, `offset` are
 * handled separately.
 */
function parseFilters(
  req: Request,
  columns: Record<string, any>,
  userId: string,
): { where: SQL | undefined; error?: string } {
  const conds: SQL[] = [];
  for (const [key, value] of Object.entries(req.query)) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const col = columns[key];
    if (!col) return { where: undefined, error: `Unknown column: ${key}` };
    const raw = Array.isArray(value) ? String(value[0]) : String(value ?? "");
    if (!raw.startsWith("eq.")) {
      return { where: undefined, error: `Unsupported operator on ${key}` };
    }
    conds.push(eq(col, coerce(col, raw.slice(3)) as never));
  }
  // Force-scope to the caller regardless of what the client sent.
  if (columns.user_id) conds.push(eq(columns.user_id, userId));
  return { where: conds.length ? and(...conds) : undefined };
}

// Columns that must NEVER be returned to the browser (server-only secrets).
const SENSITIVE_COLUMNS: Record<string, string[]> = {
  media_integrations: ["access_token", "refresh_token"],
};

function pickColumns(
  row: Record<string, unknown>,
  select: string | undefined,
  redact: string[] = [],
) {
  let out: Record<string, unknown>;
  if (!select || select === "*") {
    out = { ...row };
  } else {
    const wanted = select.split(",").map((s) => s.trim());
    out = {};
    for (const key of wanted) {
      if (key in row) out[key] = row[key];
    }
  }
  for (const key of redact) delete out[key];
  return out;
}

router.all(
  "/rest/v1/:table",
  requireUser,
  async (req: Request, res: Response) => {
    const authUser = req.authUser!;
    const table = getTable(req.params.table as string);
    if (!table) {
      res.status(404).json({ error: `Unknown table: ${req.params.table}` });
      return;
    }
    const columns = getTableColumns(table);
    const select =
      typeof req.query.select === "string" ? req.query.select : undefined;
    const redact = SENSITIVE_COLUMNS[req.params.table as string] ?? [];

    try {
      if (req.method === "GET" || req.method === "HEAD") {
        const { where, error } = parseFilters(req, columns, authUser.id);
        if (error) {
          res.status(400).json({ error });
          return;
        }
        const rows = await db.select().from(table).where(where);
        res.json(
          rows.map((r: Record<string, unknown>) =>
            pickColumns(r, select, redact),
          ),
        );
        return;
      }

      if (req.method === "POST") {
        const prefer = String(req.header("prefer") ?? "");
        const bodyRows = (
          Array.isArray(req.body) ? req.body : [req.body]
        ) as Record<string, unknown>[];
        const values = bodyRows.map((r) => {
          const clean: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) {
            if (columns[k]) clean[k] = v;
          }
          // Inserts always belong to the caller.
          if (columns.user_id) clean.user_id = authUser.id;
          return clean;
        });

        let insert = db.insert(table).values(values as never);
        if (prefer.includes("resolution=ignore-duplicates")) {
          insert = insert.onConflictDoNothing() as typeof insert;
        } else if (prefer.includes("resolution=merge-duplicates")) {
          // Upsert on the table's unique constraint columns.
          const target =
            req.params.table === "media_consent"
              ? [columns.user_id]
              : req.params.table === "media_integrations"
                ? [columns.user_id, columns.provider]
                : [columns.user_id, columns.item_id, columns.provider];
          const set: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(values[0] ?? {})) {
            if (k !== "user_id" && k !== "id") set[k] = v;
          }
          insert = insert.onConflictDoUpdate({
            target,
            set: set as never,
          }) as typeof insert;
        }
        const returned = (await insert.returning()) as Record<
          string,
          unknown
        >[];
        if (prefer.includes("return=minimal")) {
          res.status(201).end();
        } else {
          res
            .status(201)
            .json(
              returned.map((r: Record<string, unknown>) =>
                pickColumns(r, select, redact),
              ),
            );
        }
        return;
      }

      if (req.method === "PATCH") {
        const { where, error } = parseFilters(req, columns, authUser.id);
        if (error) {
          res.status(400).json({ error });
          return;
        }
        if (!where) {
          res.status(400).json({ error: "PATCH requires filters" });
          return;
        }
        const set: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(
          (req.body ?? {}) as Record<string, unknown>,
        )) {
          if (columns[k] && k !== "user_id" && k !== "id") set[k] = v;
        }
        const returned = await db
          .update(table)
          .set(set as never)
          .where(where)
          .returning();
        res.json(
          returned.map((r: Record<string, unknown>) =>
            pickColumns(r, select, redact),
          ),
        );
        return;
      }

      if (req.method === "DELETE") {
        const { where, error } = parseFilters(req, columns, authUser.id);
        if (error) {
          res.status(400).json({ error });
          return;
        }
        if (!where) {
          res.status(400).json({ error: "DELETE requires filters" });
          return;
        }
        await db.delete(table).where(where);
        res.status(204).end();
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
      req.log?.error({ err }, "rest shim error");
      res.status(500).json({ error: "Database error" });
    }
  },
);

export default router;
