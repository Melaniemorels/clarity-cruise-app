/**
 * Network-aware mutation helpers.
 * When offline, mutations are queued to localStorage and replayed on reconnect.
 * When online, they execute normally — zero UI changes, like Instagram/Facebook.
 */
import { supabase } from "@/integrations/supabase/client";
import { enqueue } from "@/lib/offline-queue";

type MutationOperation = "insert" | "update" | "upsert" | "delete";

interface NetworkMutationOptions {
  table: string;
  operation: MutationOperation;
  payload: Record<string, any>;
  matchColumn?: string;
  matchValue?: string;
}

/**
 * Execute a Supabase mutation or queue it if offline.
 * Returns { queued: true } when offline, or the Supabase result when online.
 */
export async function networkAwareMutate(options: NetworkMutationOptions) {
  const { table, operation, payload, matchColumn, matchValue } = options;

  // If offline, enqueue and return immediately (like Instagram)
  if (!navigator.onLine) {
    enqueue({ table, operation, payload, matchColumn, matchValue });
    return { queued: true, data: null, error: null };
  }

  // Online — execute normally
  try {
    let query: any;

    switch (operation) {
      case "insert":
        query = (supabase as any).from(table).insert(payload);
        break;
      case "update":
        query = (supabase as any).from(table).update(payload);
        if (matchColumn && matchValue) {
          query = query.eq(matchColumn, matchValue);
        }
        break;
      case "upsert":
        query = (supabase as any).from(table).upsert(payload);
        break;
      case "delete":
        query = (supabase as any).from(table).delete();
        if (matchColumn && matchValue) {
          query = query.eq(matchColumn, matchValue);
        }
        break;
    }

    const { data, error } = await query;
    if (error) throw error;
    return { queued: false, data, error: null };
  } catch (error) {
    // If the error is a network error, queue it
    if (!navigator.onLine || (error as any)?.message?.includes("Failed to fetch")) {
      enqueue({ table, operation, payload, matchColumn, matchValue });
      return { queued: true, data: null, error: null };
    }
    throw error;
  }
}
