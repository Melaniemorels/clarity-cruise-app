import { useCallback, useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_SUPABASE_URL as string) || "/api";

function swUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}sw.js`;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register(swUrl());
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) throw new Error("push-not-supported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("permission-denied");

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch(`${API_BASE}/push/vapid-public-key`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("push-server-unavailable");
    const { publicKey } = (await res.json()) as { publicKey: string };
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const save = await postJson("/push/subscribe", { subscription: sub.toJSON() });
  if (!save.ok) throw new Error("push-server-unavailable");
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await postJson("/push/unsubscribe", { endpoint }).catch(() => undefined);
}

/**
 * Silently re-syncs an existing push subscription with the server (e.g. after
 * login on a browser where permission was already granted). Never prompts.
 */
export async function resyncPushSubscription(): Promise<void> {
  try {
    if (!isPushSupported() || Notification.permission !== "granted") return;
    const sub = await getCurrentSubscription();
    if (!sub) return;
    await postJson("/push/subscribe", { subscription: sub.toJSON() });
  } catch {
    // best-effort only
  }
}

export function usePushNotifications() {
  const supported = isPushSupported();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported || Notification.permission !== "granted") {
        if (!cancelled) setChecked(true);
        return;
      }
      const sub = await getCurrentSubscription();
      if (!cancelled) {
        setEnabled(!!sub);
        setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      await subscribeToPush();
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, enabled, busy, checked, enable, disable };
}
