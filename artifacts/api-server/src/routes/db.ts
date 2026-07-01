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

function buildCondition(
  cols: Record<string, AnyColumn>,
  f: Filter,
): SQL | undefined {
  const column = cols[f.col];
  if (!column) return undefined; // unknown column -> ignore filter

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
// removes. To prevent cross-user writes/deletes (IDOR), any mutation on a table
// that has a `user_id` column is forced/scoped to the authenticated user. Reads
// remain open because Phase-1 features (friend availability, public profiles,
// explorer) legitimately read other users' rows.
function ownershipScope(
  cols: Record<string, AnyColumn>,
  where: SQL | undefined,
  userId: string,
): SQL | undefined {
  const userCol = cols["user_id"];
  if (!userCol) return where;
  const scope = eq(userCol, userId);
  return where ? and(where, scope) : scope;
}

function forceOwner(
  cols: Record<string, AnyColumn>,
  row: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  if (cols["user_id"]) return { ...row, user_id: userId };
  return row;
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

      switch (payload.action) {
        case "select": {
          // Count-only (head) request.
          if (payload.head && payload.count === "exact") {
            let cq = db
              .select({ count: sql<number>`count(*)::int` })
              .from(table)
              .$dynamic();
            if (where) cq = cq.where(where);
            const [{ count }] = await cq;
            res.json({ data: null, error: null, count });
            return;
          }

          let q = db.select().from(table).$dynamic();
          if (where) q = q.where(where);
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

          const rows = await q;

          let count: number | null = null;
          if (payload.count === "exact") {
            let cq = db
              .select({ count: sql<number>`count(*)::int` })
              .from(table)
              .$dynamic();
            if (where) cq = cq.where(where);
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
            forceOwner(cols, coerceValues(cols, v as Record<string, unknown>), userId),
          );
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
            forceOwner(cols, coerceValues(cols, v as Record<string, unknown>), userId),
          );
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

          // Update all provided (non-conflict) columns on conflict.
          const setObj: Record<string, unknown> = {};
          const conflictNames = new Set(
            (payload.onConflict ?? "").split(",").map((c) => c.trim()),
          );
          for (const key of Object.keys(cleaned[0] ?? {})) {
            if (!conflictNames.has(key)) setObj[key] = sql.raw(`excluded."${key}"`);
          }
          const result = await db
            .insert(table)
            .values(cleaned)
            .onConflictDoUpdate({
              target: conflictCols as never,
              set: setObj,
            })
            .returning();
          finishWrite(res, payload, result);
          return;
        }

        case "update": {
          const cleaned = coerceValues(
            cols,
            (payload.values as Record<string, unknown>) ?? {},
          );
          const writeWhere = ownershipScope(cols, where, userId);
          if (!writeWhere) {
            res.status(400).json({
              data: null,
              error: { message: "Refusing unscoped update (no filter)" },
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
          const writeWhere = ownershipScope(cols, where, userId);
          if (!writeWhere) {
            res.status(400).json({
              data: null,
              error: { message: "Refusing unscoped delete (no filter)" },
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
  rows: unknown[],
): void {
  if (payload.returning === false) {
    res.json({ data: null, error: null });
    return;
  }
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
