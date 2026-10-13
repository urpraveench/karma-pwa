import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { VAPID_PUBLIC_KEY } from '../lib/reminders';
import type { FcmDevice, PushDevice } from '../lib/types';

// Push reminders on this device (NOTIF-09, NOTIF-12): whether it can get them, asking the browser, and the subscription
// that's saved in the account (users/{uid}/devices/{id}) so the server can send to it. In the Android app, Android's own
// permission and the app's FCM token take the place of the browser's (AND-05).

/**
 * unsupported: this browser has no web push. needs-install: an iPhone or iPad outside the home-screen app, where Apple
 * allows push only once TikTym is on the home screen. blocked: notifications were refused for this site.
 * ask: never asked. on: this device is subscribed.
 */
export type PushStatus = 'unsupported' | 'needs-install' | 'blocked' | 'ask' | 'on';

const ENDPOINT_KEY = 'tiktym:push-endpoint';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

const native = () => Capacitor.isNativePlatform();
export const canPush = () => native() || (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);

/** Where to turn notifications back on once refused: Android's settings in the app (AND-05), the browser's otherwise. */
export const BLOCKED_HELP = Capacitor.isNativePlatform()
  ? { setup: 'Notifications are off for TikTym. Turn them on in Android Settings › Apps › TikTym › Notifications, then come back here.', toast: 'Notifications are off. Turn them on in Android Settings › Apps › TikTym › Notifications.' }
  : { setup: "Notifications are blocked for TikTym. Allow them in your browser's site settings, then come back here.", toast: 'Notifications are blocked. Allow them for TikTym in your browser settings.' };

/** Android's answer for notifications in the app, kept from the last check so pushAskable can answer at once (inside a tap). */
let androidPermission: string | null = null;

/**
 * Whether the first tap may ask for notifications: never answered in this browser; in the Android app, never answered,
 * or allowed (always so before Android 13) but with no token saved yet.
 */
export function pushAskable(): boolean {
  if (native()) return androidPermission === 'prompt' || androidPermission === 'prompt-with-rationale' || (androidPermission === 'granted' && !read(ENDPOINT_KEY));
  return canPush() && Notification.permission === 'default';
}
const apple = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/** The service worker, or null if it isn't running (the dev server, or a browser that blocks it). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>(r => setTimeout(() => r(null), 4000))]);
}

async function current(): Promise<PushSubscription | null> {
  return (await registration())?.pushManager.getSubscription() ?? null;
}

// The plugin's module, never the plugin itself: a promise resolved with a Capacitor plugin (a proxy) calls a native "then".
const androidPush = () => import('@capacitor/push-notifications');

async function androidStatus(): Promise<PushStatus> {
  const { PushNotifications } = await androidPush();
  androidPermission = (await PushNotifications.checkPermissions()).receive;
  if (androidPermission === 'denied') return 'blocked';
  return androidPermission === 'granted' && read(ENDPOINT_KEY) ? 'on' : 'ask';
}

/** The app's FCM token, from Android (the same token each time, until Android renews it). */
async function fcmToken(): Promise<string> {
  const { PushNotifications } = await androidPush();
  // The channel's name and description show in Android's settings for TikTym; the server sends into it (functions/src/push.ts).
  await PushNotifications.createChannel({ id: 'reminders', name: 'Reminders', description: 'Your daily reminder, the evening check and practice reminders', importance: 3 });
  return new Promise<string>((resolve, reject) => {
    const handles = [
      PushNotifications.addListener('registration', t => finish(() => resolve(t.value))),
      PushNotifications.addListener('registrationError', e => finish(() => reject(new Error(e.error)))),
    ];
    const timer = setTimeout(() => finish(() => reject(new Error('Android gave no notification token'))), 20_000);
    function finish(f: () => void) {
      clearTimeout(timer);
      handles.forEach(h => void h.then(x => x.remove()));
      f();
    }
    PushNotifications.register().catch((e: unknown) => finish(() => reject(e)));
  });
}

const fcmDevice = (token: string): FcmDevice => ({ fcm: token, platform: 'android', createdAt: Date.now() });

/** pushAskable, once Android has answered the permission check (the browser answers at once). */
export async function pushAskableSoon(): Promise<boolean> {
  if (native() && androidPermission === null) await androidStatus().catch(() => null);
  return pushAskable();
}

export async function pushStatus(): Promise<PushStatus> {
  if (native()) return androidStatus();
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
  if (native()) return enableAndroid(save);
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

async function enableAndroid(save: (id: string, d: PushDevice) => Promise<void>): Promise<PushStatus> {
  const { PushNotifications } = await androidPush();
  let p = (await PushNotifications.checkPermissions()).receive;
  if (p !== 'granted') p = (await PushNotifications.requestPermissions()).receive;
  androidPermission = p;
  if (p !== 'granted') return p === 'denied' ? 'blocked' : 'ask';
  const token = await fcmToken();
  await save(await deviceId(token), fcmDevice(token));
  write(ENDPOINT_KEY, token);
  changed();
  return 'on';
}

/** On open: if the browser renewed this device's subscription (Android, the app's token), or it was never saved, save it again. */
export async function resavePush(save: (id: string, d: PushDevice) => Promise<void>): Promise<void> {
  if (native()) {
    if (await androidStatus() === 'blocked' || androidPermission !== 'granted' || !read(ENDPOINT_KEY)) return;
    const token = await fcmToken();
    if (read(ENDPOINT_KEY) === token) return;
    await save(await deviceId(token), fcmDevice(token));
    write(ENDPOINT_KEY, token);
    return;
  }
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
