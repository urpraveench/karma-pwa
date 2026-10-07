import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errCode, startAuth, type AuthApi } from '../auth';
import { calc } from '../lib/backlog';
import { editCategory, newCategory, type CategoryForm } from '../lib/categories';
import { dayLabel, today, ymd } from '../lib/date';
import { haptic } from '../lib/feedback';
import { moment as findMoment, type Moment } from '../lib/moments';
import { defaultCategories, sampleData } from '../lib/sample';
import { saveTimer } from '../lib/timer';
import { newId } from '../lib/util';
import type { AppData, Category, DateStr, Log, User } from '../lib/types';
import type { Store } from '../store/types';
import { useFeedback } from '../ui/feedback';

export type View = 'today' | 'insights' | 'history' | 'setup';
export type Sheet = { kind: 'log'; catId?: string; custom?: boolean } | { kind: 'editCat'; id?: string } | null;
type Phase = { kind: 'boot' } | { kind: 'login'; error?: string } | { kind: 'loading' } | { kind: 'ready' };

const EMPTY: AppData = { categories: [], logs: [], settings: {} };
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

  // --- auth + session ---
  const openSession = useCallback(async (u: User, s: Store) => {
    setSession({ user: u, store: s }); setPhase({ kind: 'loading' });
    let d: AppData;
    try { d = await s.loadAll(); } catch (e) { console.error(e); setPhase({ kind: 'login', error: 'Could not load your data. Check Firestore rules and your connection.' }); return; }
    d = { ...d, settings: d.settings || {} };
    if (!d.categories.length && !d.settings.seeded) {
      d = { ...d, categories: defaultCategories(today()), settings: { ...d.settings, seeded: true } };
      await Promise.all([...d.categories.map(x => s.putCategory(x)), s.putSettings(d.settings)]).catch(() => {});
    }
    setData(d); setIntro(true); setPhase({ kind: 'ready' });
  }, [setData]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev; subscribe once
    started.current = true;
    startAuth({
      signedIn: (u, s) => void openSession(u, s),
      signedOut: () => { setSession(null); setSheet(null); setData(EMPTY); setPhase({ kind: 'login' }); },
      onSaveError: () => toast('Could not save on this device'),
    }).then(setAuth).catch(e => { console.error(e); setPhase({ kind: 'login', error: 'Could not load Firebase. Check your connection and .env.local.' }); });
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

  const logEntry = useCallback((catId: string, mins: number, date: DateStr, note = '') => {
    if (!store) return;
    if (!(mins > 0 && mins <= 1440)) { toast('Enter between 1 and 1440 minutes'); return; }
    const T0 = today(); if (date > T0) date = T0;
    const d0 = dataRef.current, before = calc(d0, T0), cat = d0.categories.find(x => x.id === catId);
    if (!cat) return;
    const l: Log = { id: newId(), catId, date, minutes: mins, note, createdAt: Date.now() };
    const d1 = { ...d0, logs: [...d0.logs, l] };
    setData(d1);
    store.addLog(l).catch(() => toast(SAVE_FAILED));
    const after = calc(d1, T0); haptic(12);
    const undo = () => {
      const cur = dataRef.current; setData({ ...cur, logs: cur.logs.filter(x => x.id !== l.id) });
      store.deleteLog(l).catch(() => {}); toast('Undone');
    };
    if (before.totals.end > 0 && after.totals.end === 0) { celebrate(after.streak, undo); return; }
    const mm = momentRef.current;
    if (mm?.minMode && mm.minGoal && before.totals.done < mm.minGoal && after.totals.done >= mm.minGoal) {
      haptic([15, 50, 25]); toast('Today counts. Anything more is a bonus.', 4500, undo); return;
    }
    const cleared = before.per[catId].today.end > 0 && after.per[catId].today.end === 0;
    toast(cleared ? `${cat.name} done for today` : `+${mins} ${cat.name}${date !== T0 ? `, ${dayLabel(date, T0)}` : ''}`, 4500, undo);
  }, [store, toast, celebrate, setData]);

  const deleteLog = useCallback((id: string) => {
    if (!store) return;
    const d0 = dataRef.current, l = d0.logs.find(x => x.id === id); if (!l) return;
    setData({ ...d0, logs: d0.logs.filter(x => x.id !== id) });
    store.deleteLog(l).catch(() => {});
    toast('Entry deleted', 4500, () => { const cur = dataRef.current; setData({ ...cur, logs: [...cur.logs, l] }); store.addLog(l).catch(() => {}); });
  }, [store, toast, setData]);

  const putCategory = useCallback((cat: Category, msg: string) => {
    if (!store) return;
    const d0 = dataRef.current, exists = d0.categories.some(x => x.id === cat.id);
    setData({ ...d0, categories: exists ? d0.categories.map(x => x.id === cat.id ? cat : x) : [...d0.categories, cat] });
    closeSheet(); void persist(() => store.putCategory(cat), msg);
  }, [store, setData, closeSheet, persist]);

  const saveCategory = useCallback((id: string | undefined, f: CategoryForm) => {
    const d0 = dataRef.current, ex = id ? d0.categories.find(x => x.id === id) : undefined;
    if (ex) putCategory(editCategory(ex, f, today()), 'Saved changes');
    else putCategory(newCategory(f, d0.categories.length), `Added ${f.name}`);
  }, [putCategory]);

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
    replaceAll({ categories: defaultCategories(today()), logs: [], settings: { seeded: true } }, 'Started over');
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

  const signOut = useCallback(async () => { await auth?.signOut(); }, [auth]);

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
    phase, auth, user, data, T, c, moment, now, intro,
    getData,
    view, setView, range, setRange, sheet, openSheet, closeSheet,
    hideMoment, tipHidden, hideTip,
    logEntry, deleteLog, saveCategory, toggleArchive, deleteCategory, setBacklogCap,
    loadSample, startOver, importBackup, exportBackup, signOut, deleteAccount,
  };
}

export type AppState = ReturnType<typeof useAppState>;
const Ctx = createContext<AppState | null>(null);
export const useApp = () => useContext(Ctx)!;

export function AppProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useAppState()}>{children}</Ctx.Provider>;
}
