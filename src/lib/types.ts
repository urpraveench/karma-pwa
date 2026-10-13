// Dates are local-time 'YYYY-MM-DD' strings throughout, so they compare correctly as strings.
export type DateStr = string;

/** A target applies from `from` until the next target's `from`. `days` are weekdays, 0 = Sunday. */
export interface Target {
  from: DateStr;
  minutes: number;
  days: number[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  startDate: DateStr;
  archivedFrom: DateStr | null;
  targets: Target[];
  /** This practice's own push reminder, 'HH:MM' local, or none (PRAC-24, NOTIF-19). */
  remind?: string | null;
}

export interface Log {
  id: string;
  catId: string;
  date: DateStr;
  minutes: number;
  note: string;
  createdAt: number;
  /** How the session felt, if the user said (LOG-31). */
  feel?: Feel;
}

/** 1 low, 2 okay, 3 good. */
export type Feel = 1 | 2 | 3;

export interface Settings {
  seeded?: boolean;
  schema?: number;
  /** Days of target a practice may carry into a new day. 0 = no limit. Default 2. */
  backlogCap?: number;
  /** Email types this account has turned off; a missing or true value means on (NOTIF-01). */
  emails?: Partial<Record<'tips' | 'recap' | 'news', boolean>>;
  /** Daily push reminder: on unless false, at `time` ('HH:MM', local) in time zone `tz` (NOTIF-09). */
  reminder?: { on?: boolean; time?: string; tz?: string };
  /** Practices left today on the app icon; a missing or true value means on (NOTIF-13). */
  badge?: boolean;
  /** The 8 pm "Did you log what you did today?" push; a missing or true value means on (NOTIF-18). */
  logNudge?: boolean;
}

/**
 * A device that allowed notifications, saved at users/{uid}/devices/{id}: a browser's web-push subscription (the id is a
 * hash of the endpoint), or the Android app's FCM token (the id is a hash of the token) (AND-05).
 */
export type PushDevice = WebPushDevice | FcmDevice;

export interface WebPushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: number;
}

export interface FcmDevice {
  fcm: string;
  platform: 'android';
  createdAt: number;
}

export interface AppData {
  categories: Category[];
  logs: Log[];
  settings: Settings;
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
}
