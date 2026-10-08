import type { AppData } from '../lib/types';
import type { Store } from './types';

/** Test-mode store: everything lives in this browser's localStorage under one key per user. */
export function LocalStore(key: string, onSaveError: () => void = () => {}): Store {
  const K = 'tiktym:data:' + key;
  let db: AppData | null;
  try { db = JSON.parse(localStorage.getItem(K) || 'null'); } catch { db = null; }
  let data: AppData = db || { categories: [], logs: [], settings: {} };
  // Report after the caller's own feedback (e.g. the "+30 Reading" toast), which would otherwise replace the warning.
  const save = () => { try { localStorage.setItem(K, JSON.stringify(data)); } catch { setTimeout(onSaveError, 0); } };
  return {
    kind: 'local',
    async loadAll() { return structuredClone(data); },
    async putCategory(c) { const i = data.categories.findIndex(x => x.id === c.id); if (i >= 0) data.categories[i] = c; else data.categories.push(c); save(); },
    async deleteCategory(id) { data.categories = data.categories.filter(c => c.id !== id); data.logs = data.logs.filter(l => l.catId !== id); save(); },
    async addLog(l) { data.logs.push(l); save(); },
    async deleteLog(l) { data.logs = data.logs.filter(x => x.id !== l.id); save(); },
    async updateLog(_prev, next) { data.logs = data.logs.map(x => x.id === next.id ? next : x); save(); },
    async putSettings(s) { data.settings = s; save(); },
    async replaceAll(d) { data = structuredClone(d); save(); },
  };
}
