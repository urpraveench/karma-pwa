import type { AppData, Category, Log, PushDevice, Settings } from '../lib/types';

/** Persistence for one signed-in user. Both adapters hold the same data; only the backing store differs. */
export interface Store {
  kind: 'local' | 'firebase';
  loadAll(): Promise<AppData>;
  putCategory(c: Category): Promise<void>;
  /** Removes the category and every log that belongs to it. */
  deleteCategory(id: string): Promise<void>;
  addLog(l: Log): Promise<void>;
  deleteLog(l: Pick<Log, 'id' | 'date'>): Promise<void>;
  /** Replaces a log with `next` (same id); `prev` says where it lives now, in case its date moves it. */
  updateLog(prev: Pick<Log, 'id' | 'date'>, next: Log): Promise<void>;
  putSettings(s: Settings): Promise<void>;
  /** Wipes everything and writes `d` in its place. */
  replaceAll(d: AppData): Promise<void>;
  /** Saves a device that allowed notifications, so the server can send it reminders (NOTIF-12). */
  putDevice(id: string, d: PushDevice): Promise<void>;
  /** Firebase only: removes all data, then the auth user. */
  deleteAccount?(): Promise<void>;
}
