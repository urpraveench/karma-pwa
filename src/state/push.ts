import { useEffect, useState } from 'react';
import { VAPID_PUBLIC_KEY } from '../lib/reminders';
import type { PushDevice } from '../lib/types';

// Push reminders on this device (NOTIF-09, NOTIF-12): whether it can get them, asking the browser, and the subscription
// that's saved in the account (users/{uid}/devices/{id}) so the server can send to it.

/**
 * unsupported: this browser has no web push. needs-install: an iPhone or iPad outside the home-screen app, where Apple
 * allows push only once TikTym is on the home screen. blocked: notifications were refused for this site.
 * ask: never asked. on: this device is subscribed.
 */
export type PushStatus = 'unsupported' | 'needs-install' | 'blocked' | 'ask' | 'on';

const ENDPOINT_KEY = 'tiktym:push-endpoint';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

export const canPush = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const apple = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/** The service worker, or null if it isn't running (the dev server, or a browser that blocks it). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>(r => setTimeout(() => r(null), 4000))]);
}

async function current(): Promise<PushSubscription | null> {
  return (await registration())?.pushManager.getSubscription() ?? null;
}

export async function pushStatus(): Promise<PushStatus> {
  if (!canPush()) return apple() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted' && await current()) return 'on';
  return 'ask';
}

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));

/** The document id for a subscription: a short hash of its endpoint, so the same device never gets two. */
export async function deviceId(endpoint: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return [...h.slice(0, 12)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function device(sub: PushSubscription): PushDevice {
  const j = sub.toJSON();
  return { endpoint: sub.endpoint, keys: { p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' }, createdAt: Date.now() };
}

/**
 * Asks the browser (only ever after a tap), subscribes, and saves the device. Returns the new status: 'on', or
 * 'blocked'/'ask' if the person said no or closed the prompt.
 */
export async function enablePush(save: (id: string, d: PushDevice) => Promise<void>): Promise<PushStatus> {
  if (!canPush()) return pushStatus();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'ask';
  const reg = await registration();
  if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC_KEY) });
  await save(await deviceId(sub.endpoint), device(sub));
  write(ENDPOINT_KEY, sub.endpoint);
  changed();
  return 'on';
}

/** On open: if the browser renewed this device's subscription, or it was never saved, save it again. */
export async function resavePush(save: (id: string, d: PushDevice) => Promise<void>): Promise<void> {
  if (!canPush() || Notification.permission !== 'granted') return;
  const sub = await current();
  if (!sub || read(ENDPOINT_KEY) === sub.endpoint) return;
  await save(await deviceId(sub.endpoint), device(sub));
  write(ENDPOINT_KEY, sub.endpoint);
}

const listeners = new Set<() => void>();
const changed = () => listeners.forEach(f => f());

/** This device's push status, kept current after enablePush. Null until known. */
export function usePushStatus(): PushStatus | null {
  const [status, setStatus] = useState<PushStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => { void pushStatus().then(s => { if (alive) setStatus(s); }); };
    check(); listeners.add(check);
    return () => { alive = false; listeners.delete(check); };
  }, []);
  return status;
}
