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
}

export interface Log {
  id: string;
  catId: string;
  date: DateStr;
  minutes: number;
  note: string;
  createdAt: number;
}

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
}

/** A device that allowed notifications, saved at users/{uid}/devices/{id} (the id is a hash of the endpoint). */
export interface PushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
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
