import { Router, type IRouter, type Request, type Response } from "express";
import { db, vyvTables } from "@workspace/db";
import type { VyvTableName } from "@workspace/db";
import {
  and,
  or,
  not,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  inArray,
  isNull,
  isNotNull,
  like,
  ilike,
  asc,
  desc,
  sql,
  getTableColumns,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

type Filter = {
  col: string;
  op: string;
  val: unknown;
};

type QueryPayload = {
  table: string;
  action: "select" | "insert" | "update" | "delete" | "upsert";
  columns?: string[];
  filters?: Filter[];
  order?: { col: string; ascending?: boolean }[];
  limit?: number | null;
  offset?: number | null;
  single?: boolean;
  maybeSingle?: boolean;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  ignoreDuplicates?: boolean;
  count?: "exact" | null;
  head?: boolean;
  returning?: boolean;
};

function getTable(name: string) {
  return (vyvTables as Record<string, unknown>)[name] as
    | (typeof vyvTables)[VyvTableName]
    | undefined;
}

// Tables whose rows are strictly personal and are NEVER read cross-user by any
// Phase-1 feature. Reads on these are force-scoped to the authenticated user so
// an authenticated caller cannot pull another user's private data by omitting a
// user_id filter. Tables deliberately left OUT (open reads) are the ones Phase-1
// legitimately reads across users: profiles/follows/handle_changes/section
// visibility (public/social graph), posts/post_likes/reactions (feed),
// explore_items + categories + activity_types (public content/reference),
// social_plans + social_plan_invites (shared planning).
// calendar_events + schedule_blocks ARE private here: the friend-availability
// overlap feature reads them server-side in functions.ts (direct db access),
// never through this generic query surface, so client reads are always
// own-rows-only.
const PRIVATE_READ_TABLES = new Set<string>([
  "calendar_events",
  "schedule_blocks",
  "media_consent",
  "notes",
  "entries",
  "notifications",
  "feed_settings",
  "ai_memories",
  "ai_calendar_audit",
  "user_explore_preferences",
  "user_item_events",
  "time_usage",
  "time_goals",
  "health_daily",
  "goals_health",
  "workout_sessions",
  "device_connections",
  "media_integrations",
]);

// Columns that must NEVER be returned to the browser (server-only secrets).
// Mirrors rest.ts SENSITIVE_COLUMNS.
const SENSITIVE_COLUMNS: Record<string, string[]> = {
  media_integrations: ["access_token", "refresh_token"],
};

function redactRows(tableName: string, rows: unknown[]): unknown[] {
  const secret = SENSITIVE_COLUMNS[tableName];
  if (!secret || secret.length === 0) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const copy: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const col of secret) delete copy[col];
    return copy;
  });
}

function buildCondition(
  cols: Record<string, AnyColumn>,
  f: Filter,
): SQL | undefined {
  const column = cols[f.col];
  if (!column) return undefined; // unknown column -> ignore filter

  // Coerce string filter values to Date for timestamp columns — drizzle's
  // date-mode timestamps call value.toISOString() when binding params, so a
  // raw ISO string from the client would throw a TypeError at query time.
  const isTimestamp = String(
    (column as { columnType?: string }).columnType,
  ).includes("Timestamp");
  if (isTimestamp) {
    if (typeof f.val === "string") {
      const d = new Date(f.val);
      if (!Number.isNaN(d.getTime())) f = { ...f, val: d };
    } else if (Array.isArray(f.val)) {
      f = {
        ...f,
        val: f.val.map((v) =>
          typeof v === "string" && !Number.isNaN(new Date(v).getTime())
            ? new Date(v)
            : v,
        ),
      };
    }
  }

  const negate = f.op.startsWith("not_");
  const op = negate ? f.op.slice(4) : f.op;
  let cond: SQL | undefined;

  switch (op) {
    case "eq":
      cond = eq(column, f.val);
      break;
    case "neq":
      cond = ne(column, f.val);
      break;
    case "gt":
      cond = gt(column, f.val);
      break;
    case "gte":
      cond = gte(column, f.val);
      break;
    case "lt":
      cond = lt(column, f.val);
      break;
    case "lte":
      cond = lte(column, f.val);
      break;
    case "in":
      cond = inArray(column, Array.isArray(f.val) ? f.val : [f.val]);
      break;
    case "like":
      cond = like(column, String(f.val));
      break;
    case "ilike":
      cond = ilike(column, String(f.val));
      break;
    case "is":
      cond =
        f.val === null
          ? isNull(column)
          : eq(column, f.val as boolean);
      break;
    default:
      cond = undefined;
  }
  if (cond && negate) {
    if (op === "is" && f.val === null) return isNotNull(column);
    return not(cond);
  }
  return cond;
}

function buildWhere(
  cols: Record<string, AnyColumn>,
  filters?: Filter[],
): SQL | undefined {
  if (!filters || filters.length === 0) return undefined;
  const conds = filters
    .map((f) => buildCondition(cols, f))
    .filter((c): c is SQL => c !== undefined);
  if (conds.length === 0) return undefined;
  return conds.length === 1 ? conds[0] : and(...conds);
}

// Write authorization: the original app relied on Postgres RLS which the shim
// removes. To prevent cross-user writes/deletes (IDOR), every mutation must be
// tied to an owner column:
//   - tables with `user_id`: forced/scoped to the authenticated user
//   - tables with other owner semantics: see OWNER_RULES below
//   - global/reference tables: client writes rejected outright
// Reads remain open (outside PRIVATE_READ_TABLES) because Phase-1 features
// (friend availability, public profiles, explorer) legitimately read other
// users' rows.

// Global/reference tables that clients must never mutate through this surface.
// They are written server-side only (explore syncs, seeds).
const READONLY_TABLES = new Set<string>([
  "explore_items",
  "categories",
  "activity_types",
]);

// Owner semantics for mutable tables that don't use a plain `user_id` column.
// insertOwner: column forced to the caller on insert/upsert.
// mutateOwners: update/delete are scoped to rows where at least one of these
// columns equals the caller (e.g. the target of a follow may accept/remove it).
const OWNER_RULES: Record<
  string,
  { insertOwner?: string; mutateOwners: string[] }
> = {
  follows: {
    insertOwner: "follower_id",
    mutateOwners: ["follower_id", "following_id"],
  },
  follow_requests: {
    insertOwner: "requester_id",
    mutateOwners: ["requester_id", "target_id"],
  },
  social_plans: { insertOwner: "creator_id", mutateOwners: ["creator_id"] },
  // Invites are created by the plan's creator (checked against social_plans
  // in assertInsertAllowed) and responded to by the invitee.
  social_plan_invites: { mutateOwners: ["invitee_id"] },
};

// Condition selecting only rows owned by the caller, or undefined when the
// table has no ownership model (in which case the mutation must be rejected).
function ownerCondition(
  tableName: string,
  cols: Record<string, AnyColumn>,
  userId: string,
): SQL | undefined {
  const userCol = cols["user_id"];
  if (userCol) return eq(userCol, userId);
  const rule = OWNER_RULES[tableName];
  if (!rule) return undefined;
  const conds = rule.mutateOwners
    .filter((c) => cols[c])
    .map((c) => eq(cols[c], userId));
  if (conds.length === 0) return undefined;
  return conds.length === 1 ? conds[0] : or(...conds);
}

function ownershipScope(
  tableName: string,
  cols: Record<string, AnyColumn>,
  where: SQL | undefined,
  userId: string,
): SQL | undefined {
  const scope = ownerCondition(tableName, cols, userId);
  if (!scope) return undefined;
  return where ? and(where, scope) : scope;
}

function forceOwner(
  tableName: string,
  cols: Record<string, AnyColumn>,
  row: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  if (cols["user_id"]) return { ...row, user_id: userId };
  const rule = OWNER_RULES[tableName];
  if (rule?.insertOwner && cols[rule.insertOwner]) {
    return { ...row, [rule.insertOwner]: userId };
  }
  return row;
}

// Columns a client may never change via update/upsert-update: rewriting an
// owner column would reassign the row to (or from) another user.
function ownerColumns(tableName: string): string[] {
  const rule = OWNER_RULES[tableName];
  return ["user_id", ...(rule ? rule.mutateOwners : [])];
}

function stripOwnerColumns(
  tableName: string,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...values };
  for (const col of ownerColumns(tableName)) delete out[col];
  return out;
}

// Extra insert validation for tables whose rows reference another user by
// design. Returns an error message, or null when the insert is allowed.
async function assertInsertAllowed(
  tableName: string,
  rows: Record<string, unknown>[],
  userId: string,
): Promise<string | null> {
  if (tableName !== "social_plan_invites") return null;
  const planIds = [
    ...new Set(
      rows
        .map((r) => r["plan_id"])
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];
  if (planIds.length === 0 || rows.some((r) => !r["plan_id"])) {
    return "plan_id is required";
  }
  const plans = getTable("social_plans");
  if (!plans) return "social_plans not available";
  const planCols = getTableColumns(plans) as unknown as Record<
    string,
    AnyColumn
  >;
  const owned = await db
    .select({ id: sql<string>`${planCols["id"]}` })
    .from(plans)
    .where(
      and(inArray(planCols["id"], planIds), eq(planCols["creator_id"], userId)),
    );
  if (owned.length !== planIds.length) {
    return "Cannot invite to a plan you did not create";
  }
  return null;
}

// Coerce incoming JSON values to types drizzle expects (timestamps as Date).
function coerceValues(
  cols: Record<string, AnyColumn>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const column = cols[key];
    if (!column) continue; // drop unknown columns
    if (
      value !== null &&
      typeof value === "string" &&
      String((column as { columnType?: string }).columnType).includes(
        "Timestamp",
      )
    ) {
      out[key] = new Date(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

router.post(
  "/db/query",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as QueryPayload;
    const table = getTable(payload.table);

    if (!table) {
      // Unknown / non-allowlisted table: fail soft like an empty result set.
      res.json({
        data: payload.single ? null : [],
        error: null,
        count: 0,
      });
      return;
    }

    const cols = getTableColumns(table) as unknown as Record<string, AnyColumn>;
    const userId = req.authUser!.id;

    try {
      const where = buildWhere(cols, payload.filters);

      if (payload.action !== "select" && READONLY_TABLES.has(payload.table)) {
        res.status(403).json({
          data: null,
          error: { message: `Table ${payload.table} is read-only` },
        });
        return;
      }

      switch (payload.action) {
        case "select": {
          // Force owner-scope on reads of strictly-personal tables so an
          // authenticated caller cannot read another user's private rows.
          const readWhere = PRIVATE_READ_TABLES.has(payload.table)
            ? ownershipScope(payload.table, cols, where, userId)
            : where;

          // Count-only (head) request.
          if (payload.head && payload.count === "exact") {
            let cq = db
              .select({ count: sql<number>`count(*)::int` })
              .from(table)
              .$dynamic();
            if (readWhere) cq = cq.where(readWhere);
            const [{ count }] = await cq;
            res.json({ data: null, error: null, count });
            return;
          }

          let q = db.select().from(table).$dynamic();
          if (readWhere) q = q.where(readWhere);
          if (payload.order && payload.order.length > 0) {
            const orderExprs = payload.order
              .filter((o) => cols[o.col])
              .map((o) =>
                o.ascending === false ? desc(cols[o.col]) : asc(cols[o.col]),
              );
            if (orderExprs.length > 0) q = q.orderBy(...orderExprs);
          }
          if (typeof payload.limit === "number") q = q.limit(payload.limit);
          if (typeof payload.offset === "number") q = q.offset(payload.offset);

          const rows = redactRows(payload.table, await q) as Record<
            string,
            unknown
          >[];

          let count: number | null = null;
          if (payload.count === "exact") {
            let cq = db
              .select({ count: sql<number>`count(*)::int` })
              .from(table)
              .$dynamic();
            if (readWhere) cq = cq.where(readWhere);
            const [c] = await cq;
            count = c.count;
          }

          if (payload.single) {
            if (rows.length === 1) {
              res.json({ data: rows[0], error: null, count });
            } else {
              res.json({
                data: null,
                error: {
                  code: "PGRST116",
                  message:
                    "JSON object requested, multiple (or no) rows returned",
                },
                count,
              });
            }
            return;
          }
          if (payload.maybeSingle) {
            res.json({ data: rows[0] ?? null, error: null, count });
            return;
          }
          res.json({ data: rows, error: null, count });
          return;
        }

        case "insert": {
          const rawList = Array.isArray(payload.values)
            ? payload.values
            : [payload.values ?? {}];
          const cleaned = rawList.map((v) =>
            forceOwner(
              payload.table,
              cols,
              coerceValues(cols, v as Record<string, unknown>),
              userId,
            ),
          );
          const insertError = await assertInsertAllowed(
            payload.table,
            cleaned,
            userId,
          );
          if (insertError) {
            res
              .status(403)
              .json({ data: null, error: { message: insertError } });
            return;
          }
          const inserted = await db
            .insert(table)
            .values(cleaned)
            .returning();
          finishWrite(res, payload, inserted);
          return;
        }

        case "upsert": {
          const rawList = Array.isArray(payload.values)
            ? payload.values
            : [payload.values ?? {}];
          const cleaned = rawList.map((v) =>
            forceOwner(
              payload.table,
              cols,
              coerceValues(cols, v as Record<string, unknown>),
              userId,
            ),
          );
          const upsertError = await assertInsertAllowed(
            payload.table,
            cleaned,
            userId,
          );
          if (upsertError) {
            res
              .status(403)
              .json({ data: null, error: { message: upsertError } });
            return;
          }
          const conflictCols = (payload.onConflict ?? "")
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c && cols[c])
            .map((c) => cols[c]);

          if (conflictCols.length === 0) {
            const inserted = await db
              .insert(table)
              .values(cleaned)
              .returning();
            finishWrite(res, payload, inserted);
            return;
          }

          if (payload.ignoreDuplicates) {
            const result = await db
              .insert(table)
              .values(cleaned)
              .onConflictDoNothing({ target: conflictCols as never })
              .returning();
            finishWrite(res, payload, result);
            return;
          }

          // Update all provided (non-conflict) columns on conflict — but never
          // owner columns, and only when the existing row belongs to the
          // caller (setWhere), so an upsert cannot hijack another user's row.
          const setObj: Record<string, unknown> = {};
          const conflictNames = new Set(
            (payload.onConflict ?? "").split(",").map((c) => c.trim()),
          );
          const protectedCols = new Set(ownerColumns(payload.table));
          for (const key of Object.keys(cleaned[0] ?? {})) {
            if (!conflictNames.has(key) && !protectedCols.has(key)) {
              setObj[key] = sql.raw(`excluded."${key}"`);
            }
          }
          const upsertScope = ownerCondition(payload.table, cols, userId);
          if (!upsertScope) {
            res.status(403).json({
              data: null,
              error: {
                message: `Refusing upsert on ${payload.table}: no ownership model`,
              },
            });
            return;
          }
          const result = await db
            .insert(table)
            .values(cleaned)
            .onConflictDoUpdate({
              target: conflictCols as never,
              set: setObj,
              setWhere: upsertScope,
            })
            .returning();
          finishWrite(res, payload, result);
          return;
        }

        case "update": {
          const cleaned = stripOwnerColumns(
            payload.table,
            coerceValues(cols, (payload.values as Record<string, unknown>) ?? {}),
          );
          if (Object.keys(cleaned).length === 0) {
            res.status(400).json({
              data: null,
              error: { message: "No updatable columns in payload" },
            });
            return;
          }
          const writeWhere = ownershipScope(payload.table, cols, where, userId);
          if (!writeWhere) {
            res.status(403).json({
              data: null,
              error: {
                message: `Refusing update on ${payload.table}: no ownership model`,
              },
            });
            return;
          }
          const updated = await db
            .update(table)
            .set(cleaned)
            .where(writeWhere)
            .returning();
          finishWrite(res, payload, updated);
          return;
        }

        case "delete": {
          const writeWhere = ownershipScope(payload.table, cols, where, userId);
          if (!writeWhere) {
            res.status(403).json({
              data: null,
              error: {
                message: `Refusing delete on ${payload.table}: no ownership model`,
              },
            });
            return;
          }
          const deleted = await db
            .delete(table)
            .where(writeWhere)
            .returning();
          finishWrite(res, payload, deleted);
          return;
        }

        default:
          res.status(400).json({ data: null, error: { message: "Bad action" } });
      }
    } catch (err) {
      req.log?.error({ err }, "db/query failed");
      res.json({
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Query failed",
        },
        count: null,
      });
    }
  },
);

function finishWrite(
  res: Response,
  payload: QueryPayload,
  rawRows: unknown[],
): void {
  if (payload.returning === false) {
    res.json({ data: null, error: null });
    return;
  }
  const rows = redactRows(payload.table, rawRows);
  if (payload.single) {
    res.json({ data: rows[0] ?? null, error: null });
    return;
  }
  if (payload.maybeSingle) {
    res.json({ data: rows[0] ?? null, error: null });
    return;
  }
  res.json({ data: rows, error: null });
}

export default router;
