/**
 * Offline sync queue — stores pending mutations in localStorage
 * and replays them when the connection is restored using raw REST calls.
 */

export interface QueuedAction {
  id: string;
  table: string;
  operation: "insert" | "update" | "upsert" | "delete";
  payload: Record<string, any>;
  matchColumn?: string;
  matchValue?: string;
  createdAt: number;
}

const QUEUE_KEY = "vyv-offline-queue";

function readQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(action: Omit<QueuedAction, "id" | "createdAt">) {
  const queue = readQueue();
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  });
  writeQueue(queue);
}

export function getQueueSize(): number {
  return readQueue().length;
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

/**
 * Replay all queued actions against backend via REST.
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`;
  const headers = await getAuthHeaders();

  let synced = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      let url = `${baseUrl}/${action.table}`;
      let method = "POST";
      let body: string | undefined = JSON.stringify(action.payload);

      switch (action.operation) {
        case "insert":
          method = "POST";
          break;
        case "update":
          if (action.matchColumn && action.matchValue) {
            url += `?${action.matchColumn}=eq.${encodeURIComponent(action.matchValue)}`;
            method = "PATCH";
          } else {
            failed++;
            remaining.push(action);
            continue;
          }
          break;
        case "upsert": {
          method = "POST";
          const upsertHeaders = { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" };
          const res = await fetch(url, { method, headers: upsertHeaders, body });
          if (res.ok || res.status === 409) synced++;
          else { failed++; remaining.push(action); }
          continue;
        }
        case "delete":
          if (action.matchColumn && action.matchValue) {
            url += `?${action.matchColumn}=eq.${encodeURIComponent(action.matchValue)}`;
            method = "DELETE";
            body = undefined;
          } else {
            failed++;
            remaining.push(action);
            continue;
          }
          break;
      }

      const res = await fetch(url, { method, headers, body });
      if (res.ok || res.status === 409) {
        synced++;
      } else {
        console.warn("[offline-queue] Sync failed:", action.id, res.status);
        failed++;
        remaining.push(action);
      }
    } catch (err) {
      console.warn("[offline-queue] Network error:", action.id, err);
      failed++;
      remaining.push(action);
    }
  }

  writeQueue(remaining);
  return { synced, failed };
}
