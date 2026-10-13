import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errCode, startAuth, type AuthApi } from '../auth';
import { calc, carriedLeft, dueLeft, practicesLeft } from '../lib/backlog';
import { editCategory, moveCategory, newCategory, nextOrder, type CategoryForm } from '../lib/categories';
import { dayLabel, today, ymd } from '../lib/date';
import { startAccountAnalytics, track } from '../lib/analytics';
import type { EmailKind } from '../lib/notifications';
import { count, countActiveDevice, flushStats, type Counter } from '../lib/stats';
import { haptic } from '../lib/feedback';
import { moment as findMoment, type Moment } from '../lib/moments';
import { startingCategories, type Choice } from '../lib/firstRun';
import { defaultCategories, sampleData } from '../lib/sample';
import { saveTimer } from '../lib/timer';
import { badgeCount, reminderOn, reminderTime, timeLabel } from '../lib/reminders';
import { canPush, enablePush, resavePush, type PushStatus } from './push';
import { newId } from '../lib/util';
import { shouldAutoReload, startErrorMessage } from '../lib/startError';
import { reloadToLatest } from './update';
import type { AppData, Category, DateStr, Feel, Log, User } from '../lib/types';
import type { Store } from '../store/types';
import { useFeedback } from '../ui/feedback';
import type { VoiceCapture } from '../lib/voiceCapture';

export type View = 'today' | 'insights' | 'history' | 'setup';
export type LogMethod = 'quick' | 'tile' | 'all_left' | 'custom' | 'timer' | 'voice' | 'other';
export interface LogDraft { catId: string; mins: number; date: DateStr; note?: string }
export type Sheet = { kind: 'log'; catId?: string; custom?: boolean; voice?: boolean; voiceCapture?: VoiceCapture } | { kind: 'editCat'; id?: string } | { kind: 'share' } | { kind: 'streak' } | { kind: 'editLog'; id: string } | { kind: 'install' } | null;
const AUTO_RELOAD_KEY = 'tiktym:autoReloadAt'; // this tab only, so a new tab may try again
const lastAutoReload = () => { try { const v = sessionStorage.getItem(AUTO_RELOAD_KEY); return v ? Number(v) : null; } catch { return null; } };
const markAutoReload = () => { try { sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now())); } catch { /* reload anyway */ } };

type Phase = { kind: 'boot' } | { kind: 'login'; error?: string; retry?: boolean } | { kind: 'loading' } | { kind: 'choose' } | { kind: 'ready' };

const EMPTY: AppData = { categories: [], logs: [], settings: {} };
const METHOD_COUNTER: Record<LogMethod, Counter> = { quick: 'logQuick', tile: 'logTile', all_left: 'logAllLeft', custom: 'logCustom', timer: 'logTimer', voice: 'logOther', other: 'logOther' };
const SAVE_FAILED = 'Could not save. Check your connection.';
const momentKey = (T: DateStr) => 'tiktym:moment:' + T;
const TIP_KEY = 'tiktym:tip-timer';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

function useAppState() {
  const { toast, celebrate } = useFeedback();
  const [phase, setPhase] = useState<Phase>({ kind: 'boot' });
  const [auth, setAuth] = useState<AuthApi | null>(null);
  const [session, setSession] = useState<{ user: User; store: Store } | null>(null);
  const [data, setDataState] = useState<AppData>(EMPTY);
  const [view, setViewState] = useState<View>('today');
  const [range, setRange] = useState(7);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [intro, setIntro] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [prefsVersion, setPrefsVersion] = useState(0);

  // Actions read the latest data through a ref, so callbacks held by timers and toasts never act on stale state.
  const dataRef = useRef(data);
  const setData = useCallback((next: AppData) => { dataRef.current = next; setDataState(next); }, []);
  const getData = useCallback(() => dataRef.current, []);
  const store = session?.store;
  const user = session?.user ?? null;

  // --- derived: today, the backlog calc, and the moment card ---
  const T = ymd(now);
  const c = useMemo(() => calc(data, T), [data, T]);
  // prefsVersion bumps when a moment is hidden, so this re-reads localStorage
  const hidden = useMemo(() => read(momentKey(T)), [T, prefsVersion]);
  const tipHidden = useMemo(() => !!read(TIP_KEY), [prefsVersion]);
  const moment = useMemo(() => findMoment(c, { data, user, hidden, now }), [c, data, user, hidden, now]);
  const momentRef = useRef<Moment | null>(moment);
  useEffect(() => { momentRef.current = moment; }, [moment]);

  // Keep "today", the greeting and the moment current across midnight and when returning to the app.
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const id = setInterval(refresh, 60_000);
    const vis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);

  // The mala's bead animation plays on first load and after loading sample data.
  useEffect(() => {
    if (!intro || phase.kind !== 'ready') return;
    const t = setTimeout(() => setIntro(false), 1500);
    return () => clearTimeout(t);
  }, [intro, phase.kind]);

  // The app icon shows how many practices are left today, where the device supports it (NOTIF-13); a reminder push
  // refreshes it while the app is closed. Cleared when the day is clear, the badge is off, or nobody is signed in.
  const badge = phase.kind === 'ready' ? badgeCount(data.settings, practicesLeft(data, T, c)) : 0;
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    (badge ? nav.setAppBadge(badge) : nav.clearAppBadge()).catch(() => { /* iPhone: only once notifications are allowed */ });
  }, [badge]);

  // --- auth + session ---
  const openSession = useCallback(async (u: User, s: Store) => {
    setSession({ user: u, store: s }); setPhase({ kind: 'loading' });
    let d: AppData;
    try { d = await s.loadAll(); } catch (e) { console.error(e); setPhase({ kind: 'login', error: startErrorMessage('data', navigator.onLine), retry: true }); return; }
    d = { ...d, settings: d.settings || {} };
    setData(d);
    countActiveDevice();
    // a brand-new account chooses its practices first; nothing is saved until it does (FIRST-12)
    if (!d.categories.length && !d.settings.seeded) { setPhase({ kind: 'choose' }); return; }
    startAccountAnalytics();
    setIntro(true); setPhase({ kind: 'ready' });
  }, [setData]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev; subscribe once
    started.current = true;
    startAuth({
      signedIn: (u, s) => void openSession(u, s),
      signedOut: () => { setSession(null); setSheet(null); setData(EMPTY); setPhase({ kind: 'login' }); },
      onSaveError: () => toast('Could not save on this device'),
    }).then(setAuth).catch(e => {
      console.error(e);
      // A copy from before a deploy asks for code the server no longer has: reload once into the new version (APP-33)
      if (shouldAutoReload(e, lastAutoReload(), Date.now(), navigator.onLine)) { markAutoReload(); void reloadToLatest(); return; }
      setPhase({ kind: 'login', error: startErrorMessage('start', navigator.onLine), retry: true });
    });
  }, [openSession, setData, toast]);

  // --- UI state ---
  const setView = useCallback((v: View) => { setViewState(v); window.scrollTo(0, 0); }, []);
  const openSheet = useCallback((s: Sheet) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const hideMoment = useCallback((key: string) => { write(momentKey(today()), key); setPrefsVersion(v => v + 1); }, []);
  const hideTip = useCallback(() => { write(TIP_KEY, '1'); setPrefsVersion(v => v + 1); }, []);

  // --- mutations: update local state first, then persist ---
  const persist = useCallback(async (fn: () => Promise<unknown>, okMsg?: string) => {
    try { await fn(); if (okMsg) toast(okMsg); } catch (e) { console.error(e); toast(SAVE_FAILED); }
  }, [toast]);

  /** Creates the practices picked on first run and opens Today (FIRST-08). */
  const choosePractices = useCallback((picked: Pick<Choice, 'name' | 'minutes'>[]) => {
    if (!store || !picked.length) return;
    const d0 = dataRef.current, categories = startingCategories(picked, today()), settings = { ...d0.settings, seeded: true };
    setData({ ...d0, categories, settings });
    void persist(() => Promise.all([...categories.map(c => store.putCategory(c)), store.putSettings(settings)]));
    count('signUps'); // a brand-new account, however it signed up
    startAccountAnalytics(); track('sign_up', { practices: picked.length });
    setIntro(true); setPhase({ kind: 'ready' });
  }, [store, setData, persist]);

  /** Saves one reviewed batch and gives the whole batch one confirmation and one Undo (LOG-28). */
  /** Saves how an entry felt, from the toast's faces (LOG-31). */
  const setFeel = useCallback((id: string, feel: Feel) => {
    if (!store) return;
    const cur = dataRef.current, prev = cur.logs.find(x => x.id === id); if (!prev) return;
    const next = { ...prev, feel };
    setData({ ...cur, logs: cur.logs.map(x => x.id === id ? next : x) });
    store.updateLog(prev, next).catch(() => toast(SAVE_FAILED));
    toast('Noted', 1600);
  }, [store, toast, setData]);

  const logEntries = useCallback((drafts: LogDraft[], method: LogMethod = 'other') => {
    if (!store || !drafts.length) return;
    if (drafts.some(x => !(x.mins > 0 && x.mins <= 1440))) { toast('Enter between 1 and 1440 minutes'); return; }
    const T0 = today(), d0 = dataRef.current, before = calc(d0, T0), now = Date.now();
    const logs: Log[] = [];
    for (const [i, draft] of drafts.entries()) {
      if (!d0.categories.some(x => x.id === draft.catId)) return;
      logs.push({ id: newId(), catId: draft.catId, date: draft.date > T0 ? T0 : draft.date, minutes: draft.mins, note: draft.note || '', createdAt: now + i });
    }
    const d1 = { ...d0, logs: [...d0.logs, ...logs] };
    setData(d1);
    Promise.all(logs.map(l => store.addLog(l))).catch(() => toast(SAVE_FAILED));
    const after = calc(d1, T0); haptic(12);
    for (const l of logs) {
      track('log_entry', { method, minutes: l.minutes, backfill: l.date !== T0 });
      count('logs'); count('minutes', l.minutes); count(METHOD_COUNTER[method]);
    }
    const undo = () => {
      const ids = new Set(logs.map(l => l.id)), cur = dataRef.current;
      setData({ ...cur, logs: cur.logs.filter(x => !ids.has(x.id)) });
      Promise.all(logs.map(l => store.deleteLog(l))).catch(() => toast(SAVE_FAILED)); toast('Undone');
    };
    if (before.totals.end > 0 && after.totals.end === 0) { celebrate(after.streak, undo, after.shields > before.shields); return; }
    if (logs.length > 1) {
      const minutes = logs.reduce((n, l) => n + l.minutes, 0);
      toast(`Logged ${logs.length} entries · ${minutes} minutes`, 4500, undo); return;
    }
    const l = logs[0], cat = d0.categories.find(x => x.id === l.catId)!;
    const mm = momentRef.current;
    if (mm?.minMode && mm.minGoal && before.totals.done < mm.minGoal && after.totals.done >= mm.minGoal) {
      haptic([15, 50, 25]); toast('Today counts. Anything more is a bonus.', 4500, undo); return;
    }
    const b = before.per[l.catId].today, a = after.per[l.catId].today, cleared = b.end > 0 && a.end === 0;
    const todayDone = l.date === T0 && dueLeft(b) > 0 && dueLeft(a) === 0 && a.end > 0;
    toast(cleared ? `${cat.name} done for today` : todayDone ? `Today's ${cat.name} done, ${carriedLeft(a)} carried left` : `+${l.minutes} ${cat.name}${l.date !== T0 ? `, ${dayLabel(l.date, T0)}` : ''}`, 6000, undo, feel => setFeel(l.id, feel));
  }, [store, toast, celebrate, setData, setFeel]);

  /** `method` says how the minutes were logged, for anonymous analytics (with consent). */
  const logEntry = useCallback((catId: string, mins: number, date: DateStr, note = '', method: LogMethod = 'other') => {
    logEntries([{ catId, mins, date, note }], method);
  }, [logEntries]);

  const deleteLog = useCallback((id: string) => {
    if (!store) return;
    const d0 = dataRef.current, l = d0.logs.find(x => x.id === id); if (!l) return;
    setData({ ...d0, logs: d0.logs.filter(x => x.id !== id) });
    store.deleteLog(l).catch(() => toast(SAVE_FAILED));
    toast('Entry deleted', 4500, () => { const cur = dataRef.current; setData({ ...cur, logs: [...cur.logs, l] }); store.addLog(l).catch(() => toast(SAVE_FAILED)); });
  }, [store, toast, setData]);

  /** Changes an entry's practice, day, minutes or note (HIST-07), with Undo. */
  const updateLog = useCallback((id: string, f: Pick<Log, 'catId' | 'date' | 'minutes' | 'note'>) => {
    if (!store) return;
    if (!(f.minutes > 0 && f.minutes <= 1440)) { toast('Enter between 1 and 1440 minutes'); return; }
    const d0 = dataRef.current, prev = d0.logs.find(x => x.id === id); if (!prev) return;
    const T0 = today(), next: Log = { ...prev, ...f, date: f.date > T0 ? T0 : f.date };
    closeSheet();
    if (next.catId === prev.catId && next.date === prev.date && next.minutes === prev.minutes && next.note === prev.note) return;
    const swap = (from: Log, to: Log) => { const cur = dataRef.current; setData({ ...cur, logs: cur.logs.map(x => x.id === id ? to : x) }); return store.updateLog(from, to).catch(() => toast(SAVE_FAILED)); };
    void swap(prev, next);
    toast('Entry updated', 4500, () => { void swap(next, prev); });
  }, [store, toast, setData, closeSheet]);

  const putCategory = useCallback((cat: Category, msg: string) => {
    if (!store) return;
    const d0 = dataRef.current, exists = d0.categories.some(x => x.id === cat.id);
    setData({ ...d0, categories: exists ? d0.categories.map(x => x.id === cat.id ? cat : x) : [...d0.categories, cat] });
    closeSheet(); void persist(() => store.putCategory(cat), msg);
  }, [store, setData, closeSheet, persist]);

  /**
   * A practice got its own reminder (PRAC-24): its time is local, so the account needs this device's time zone, and the
   * phone must allow notifications. Called from the Save tap, so the browser lets it ask; with the daily reminder on,
   * the first tap of each open already asks (below), so it doesn't ask twice.
   */
  const remindPractice = useCallback(() => {
    if (!store) return;
    const d0 = dataRef.current, tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (d0.settings.reminder?.tz !== tz) {
      const settings = { ...d0.settings, reminder: { ...d0.settings.reminder, tz } };
      setData({ ...d0, settings });
      void persist(() => store.putSettings(settings));
    }
    if (canPush() && Notification.permission === 'default' && !reminderOn(d0.settings)) {
      void enablePush((id, d) => store.putDevice(id, d))
        .then(status => { if (status === 'blocked') toast('Notifications are blocked. Allow them for TikTym in your browser settings.', 5000); })
        .catch(e => console.warn(e));
    }
  }, [store, setData, persist, toast]);

  const saveCategory = useCallback((id: string | undefined, f: CategoryForm) => {
    const d0 = dataRef.current, ex = id ? d0.categories.find(x => x.id === id) : undefined;
    if (ex) putCategory(editCategory(ex, f, today()), 'Saved changes');
    else { putCategory(newCategory(f, nextOrder(d0.categories)), `Added ${f.name}`); track('practice_added'); count('practicesAdded'); }
    if (f.remind) remindPractice();
  }, [putCategory, remindPractice]);

  /** Moves a practice one place up or down (PRAC-22). */
  const reorderCategory = useCallback((id: string, dir: -1 | 1) => {
    if (!store) return;
    const d0 = dataRef.current, changed = new Map(moveCategory(d0.categories, id, dir).map(c => [c.id, c]));
    if (!changed.size) return;
    setData({ ...d0, categories: d0.categories.map(c => changed.get(c.id) ?? c) });
    haptic(6);
    Promise.all([...changed.values()].map(c => store.putCategory(c))).catch(() => toast(SAVE_FAILED));
  }, [store, setData, toast]);

  const toggleArchive = useCallback((id: string) => {
    const ex = dataRef.current.categories.find(x => x.id === id); if (!ex) return;
    const cat = { ...ex, archivedFrom: ex.archivedFrom ? null : today() };
    putCategory(cat, cat.archivedFrom ? `Archived ${cat.name}. Its backlog is cleared.` : `Restored ${cat.name}`);
  }, [putCategory]);

  const deleteCategory = useCallback((id: string) => {
    if (!store) return;
    const d0 = dataRef.current, cat = d0.categories.find(x => x.id === id); if (!cat) return;
    if (!confirm(`Delete ${cat.name} and all its logged minutes? Archive keeps the history instead.`)) return;
    setData({ ...d0, categories: d0.categories.filter(x => x.id !== id), logs: d0.logs.filter(l => l.catId !== id) });
    closeSheet(); void persist(() => store.deleteCategory(id), `Deleted ${cat.name}`);
  }, [store, setData, closeSheet, persist]);

  /** Turns one type of email on or off for this account (NOTIF-01); the server reads it before sending. */
  const setEmailPref = useCallback((kind: EmailKind, on: boolean) => {
    if (!store) return;
    const d0 = dataRef.current, settings = { ...d0.settings, emails: { ...d0.settings.emails, [kind]: on } };
    setData({ ...d0, settings });
    void persist(() => store.putSettings(settings));
  }, [store, setData, persist]);

  /** The daily reminder's switch or time (NOTIF-09), saved with this device's time zone so it comes at local time. */
  const setReminder = useCallback((patch: { on?: boolean; time?: string }) => {
    if (!store) return;
    const d0 = dataRef.current, tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const settings = { ...d0.settings, reminder: { ...d0.settings.reminder, ...patch, tz } };
    setData({ ...d0, settings });
    void persist(() => store.putSettings(settings));
  }, [store, setData, persist]);

  /** After a tap only: asks the browser for notifications, saves this device, and sets the reminder time (NOTIF-12). */
  const enableReminders = useCallback(async (time: string): Promise<PushStatus> => {
    if (!store) return 'unsupported';
    let status: PushStatus;
    try { status = await enablePush((id, d) => store.putDevice(id, d)); }
    catch (e) { console.warn(e); toast('Could not turn on reminders. Try again later.'); return 'ask'; }
    if (status === 'on') { setReminder({ on: true, time }); toast(`Reminder set for ${timeLabel(time)}, if anything's left`); track('reminders_on'); }
    else if (status === 'blocked') toast('Notifications are blocked. Allow them for TikTym in your browser settings.', 5000);
    return status;
  }, [store, setReminder, toast]);

  /** The 8 pm evening log check (NOTIF-18). */
  const setLogNudge = useCallback((on: boolean) => {
    if (!store) return;
    const d0 = dataRef.current, settings = { ...d0.settings, logNudge: on };
    setData({ ...d0, settings });
    void persist(() => store.putSettings(settings));
  }, [store, setData, persist]);

  /** Practices left today on the app icon (NOTIF-13). */
  const setBadge = useCallback((on: boolean) => {
    if (!store) return;
    const d0 = dataRef.current, settings = { ...d0.settings, badge: on };
    setData({ ...d0, settings });
    void persist(() => store.putSettings(settings));
  }, [store, setData, persist]);

  // A device that allowed notifications stays saved in the account if the browser renews its subscription, and the
  // reminder follows the person's time zone when they travel.
  useEffect(() => {
    if (phase.kind !== 'ready' || !store) return;
    void resavePush((id, d) => store.putDevice(id, d)).catch(e => console.warn(e));
    const r = dataRef.current.settings.reminder, tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (r?.tz && r.tz !== tz) setReminder({});
  }, [phase.kind, store, setReminder]);

  // The reminder is on by default in every account (NOTIF-12), but a phone shows nothing until it allows notifications,
  // and browsers only let a page ask from a tap. So the first tap anywhere asks, once per open, with no screen of our own.
  useEffect(() => {
    if ((phase.kind !== 'ready' && phase.kind !== 'choose') || !store) return;
    if (!canPush() || Notification.permission !== 'default' || !reminderOn(dataRef.current.settings)) return;
    const ask = () => {
      document.removeEventListener('pointerup', ask, true);
      document.removeEventListener('keydown', ask, true);
      if (Notification.permission === 'default') void enableReminders(reminderTime(dataRef.current.settings));
    };
    document.addEventListener('pointerup', ask, true);
    document.addEventListener('keydown', ask, true);
    return () => { document.removeEventListener('pointerup', ask, true); document.removeEventListener('keydown', ask, true); };
  }, [phase.kind, store, enableReminders]);

  const setBacklogCap = useCallback((v: number) => {
    if (!store) return;
    const d0 = dataRef.current, settings = { ...d0.settings, backlogCap: v };
    setData({ ...d0, settings });
    void persist(() => store.putSettings(settings), v ? `Backlog capped at ${v} day${v === 1 ? '' : 's'} per practice` : 'Backlog has no limit');
  }, [store, setData, persist]);

  const replaceAll = useCallback((d: AppData, msg: string) => {
    if (!store) return;
    setData(d); void persist(() => store.replaceAll(d), msg);
  }, [store, setData, persist]);

  const loadSample = useCallback(() => {
    if (!confirm('Replace all your data with sample data?')) return;
    setIntro(true); replaceAll(sampleData(dataRef.current.settings), 'Sample data loaded');
  }, [replaceAll]);

  const startOver = useCallback(() => {
    if (!confirm('Delete all logs and reset to the default practices?')) return;
    replaceAll({ categories: defaultCategories(today()), logs: [], settings: { seeded: true, emails: dataRef.current.settings.emails, reminder: dataRef.current.settings.reminder, badge: dataRef.current.settings.badge } }, 'Started over');
  }, [replaceAll]);

  const importBackup = useCallback(async (file: File) => {
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.categories) || !Array.isArray(d.logs)) throw new Error('bad');
      if (!confirm(`Import ${d.categories.length} practices and ${d.logs.length} entries? This replaces your current data.`)) return;
      replaceAll({ categories: d.categories, logs: d.logs, settings: d.settings || { seeded: true } }, 'Backup imported');
    } catch { toast('That file isn\'t a TikTym backup'); }
  }, [replaceAll, toast]);

  const exportBackup = useCallback(() => {
    const b = new Blob([JSON.stringify({ app: 'tiktym', version: 1, exportedAt: new Date().toISOString(), ...dataRef.current }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `tiktym-backup-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, []);

  // save the anonymous totals first: once signed out, the rules refuse the write
  const signOut = useCallback(async () => { flushStats(); await auth?.signOut(); }, [auth]);

  const deleteAccount = useCallback(async () => {
    if (!store?.deleteAccount) return;
    if (prompt('This permanently deletes your account, practices and every logged minute. Type DELETE to confirm.') !== 'DELETE') { toast('Account not deleted'); return; }
    try { await store.deleteAccount(); saveTimer(null); toast('Account deleted'); }
    catch (e) {
      if ((e as { code?: string }).code === 'auth/requires-recent-login') { toast('For security, sign in again, then delete your account.', 5000); void signOut(); }
      else toast('Could not delete: ' + errCode(e));
    }
  }, [store, toast, signOut]);

  return {
    phase, auth, user, data, T, c, moment, now, intro, choosePractices,
    getData,
    view, setView, range, setRange, sheet, openSheet, closeSheet,
    hideMoment, tipHidden, hideTip,
    logEntry, logEntries, deleteLog, updateLog, saveCategory, reorderCategory, toggleArchive, deleteCategory, setBacklogCap, setEmailPref,
    setReminder, enableReminders, setBadge, setLogNudge,
    loadSample, startOver, importBackup, exportBackup, signOut, deleteAccount,
  };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);
export const useApp = () => useContext(Ctx)!;

export function AppProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useAppState()}>{children}</Ctx.Provider>;
}
