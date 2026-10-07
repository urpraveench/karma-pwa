
const DEL = Symbol('del'); let reads = 0;
const db = new Map(); // path -> data
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const deepMerge = (a, b) => { const o = { ...(a||{}) }; for (const [k,v] of Object.entries(b)) { if (v === DEL) delete o[k]; else o[k] = isObj(v) && isObj(o[k]) ? deepMerge(o[k], v) : v; } return o; };
const f = {
  collection: (_db, ...p) => ({ path: p.join('/') }),
  doc: (a, ...p) => ({ path: (a.path ? [a.path, ...p] : p).join('/') }),
  deleteField: () => DEL,
  async getDocs(c){ const docs = [...db.keys()].filter(k => k.startsWith(c.path + '/') && !k.slice(c.path.length+1).includes('/')).map(k => ({ ref:{path:k}, data:() => structuredClone(db.get(k)) })); reads += Math.max(1, docs.length); return { docs, empty: !docs.length }; },
  async getDoc(r){ reads++; return { exists: () => db.has(r.path), data: () => structuredClone(db.get(r.path)) }; },
  async setDoc(r, d, o){ db.set(r.path, o?.merge ? deepMerge(db.get(r.path), d) : deepMerge({}, d)); },
  async updateDoc(r, d){ if (!db.has(r.path)) throw new Error('no doc'); const cur = structuredClone(db.get(r.path));
    for (const [k,v] of Object.entries(d)) { const ps = k.split('.'); let o = cur; for (const p of ps.slice(0,-1)) o = (o[p] ||= {}); if (v === DEL) delete o[ps.at(-1)]; else o[ps.at(-1)] = v; } db.set(r.path, cur); },
  async deleteDoc(r){ db.delete(r.path); },
  writeBatch(){ const ops = []; return { set:(r,d,o)=>ops.push(()=>f.setDoc(r,d,o)), update:(r,d)=>ops.push(()=>f.updateDoc(r,d)), delete:r=>ops.push(()=>f.deleteDoc(r)), commit: async()=>{ for (const o of ops) await o(); } }; },
};
let authDeleted = false;
const FB = { fs:f, db:{}, auth:{ currentUser:{} }, A:{ deleteUser: async () => { authDeleted = true; } } };
function FirebaseStore(FB, uid){
  const f = FB.fs, db = FB.db;
  const cats = () => f.collection(db, 'users', uid, 'categories');
  const months = () => f.collection(db, 'users', uid, 'months');
  const monthRef = m => f.doc(db, 'users', uid, 'months', m);
  const legacyLogs = () => f.collection(db, 'users', uid, 'logs');
  const settingsDoc = () => f.doc(db, 'users', uid, 'meta', 'settings');
  const mk = d => d.slice(0, 7);
  const group = logs => { const g = {}; for (const l of logs) (g[mk(l.date)] ||= {})[l.id] = l; return g; };
  const commitChunks = async ops => { for (let i = 0; i < ops.length; i += 400) { const b = f.writeBatch(db); ops.slice(i, i + 400).forEach(op => op(b)); await b.commit(); } };
  async function migrateLegacy(){ // schema 1 stored one doc per log
    const old = await f.getDocs(legacyLogs()); if (old.empty) return;
    const g = group(old.docs.map(d => d.data()));
    await commitChunks([...Object.entries(g).map(([m, entries]) => b => b.set(monthRef(m), { entries }, { merge:true })), ...old.docs.map(d => b => b.delete(d.ref))]);
  }
  async function wipe(){
    const [c, m, l] = await Promise.all([f.getDocs(cats()), f.getDocs(months()), f.getDocs(legacyLogs())]);
    await commitChunks([...c.docs, ...m.docs, ...l.docs].map(x => b => b.delete(x.ref)));
  }
  return {
    kind:'firebase',
    async loadAll(){
      let [c, mo, s] = await Promise.all([f.getDocs(cats()), f.getDocs(months()), f.getDoc(settingsDoc())]);
      let settings = s.exists() ? s.data() : {};
      if (settings.schema !== 2) { await migrateLegacy(); settings = { ...settings, schema:2 }; await f.setDoc(settingsDoc(), settings, { merge:true }); mo = await f.getDocs(months()); }
      return { categories: c.docs.map(d => d.data()), logs: mo.docs.flatMap(d => Object.values(d.data().entries || {})), settings };
    },
    putCategory: c => f.setDoc(f.doc(cats(), c.id), c),
    async deleteCategory(id){
      const mo = await f.getDocs(months()), ops = [];
      mo.docs.forEach(d => { const upd = {}; Object.values(d.data().entries || {}).forEach(l => { if (l.catId === id) upd[`entries.${l.id}`] = f.deleteField(); }); if (Object.keys(upd).length) ops.push(b => b.update(d.ref, upd)); });
      ops.push(b => b.delete(f.doc(cats(), id)));
      await commitChunks(ops);
    },
    addLog: l => f.setDoc(monthRef(mk(l.date)), { entries: { [l.id]: l } }, { merge:true }),
    deleteLog: l => f.updateDoc(monthRef(mk(l.date)), { [`entries.${l.id}`]: f.deleteField() }),
    putSettings: s => f.setDoc(settingsDoc(), { ...s, schema:2 }, { merge:true }),
    async replaceAll(d){
      await wipe();
      await commitChunks([
        ...d.categories.map(x => b => b.set(f.doc(cats(), x.id), x)),
        ...Object.entries(group(d.logs)).map(([m, entries]) => b => b.set(monthRef(m), { entries })),
        b => b.set(settingsDoc(), { ...(d.settings || {}), schema:2 }),
      ]);
    },
    async deleteAccount(){ // data first, then the auth user (may require a recent sign-in)
      await wipe(); await f.deleteDoc(settingsDoc());
      await FB.A.deleteUser(FB.auth.currentUser);
    },
  };
}


const assert = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
const uid = 'u1';
// legacy schema-1 data: 300 individual log docs across 3 months
const L = []; for (let i = 0; i < 300; i++) { const m = ['2026-08','2026-09','2026-10'][i % 3]; const l = { id:'l'+i, catId: i % 2 ? 'a' : 'b', date:`${m}-0${1 + i % 9}`, minutes:10 }; L.push(l); db.set(`users/${uid}/logs/${l.id}`, l); }
db.set(`users/${uid}/categories/a`, { id:'a' }); db.set(`users/${uid}/categories/b`, { id:'b' });
const st = FirebaseStore(FB, uid);
let d = await st.loadAll();
assert(d.logs.length === 300, 'migration keeps all 300 logs');
assert(![...db.keys()].some(k => k.includes('/logs/')), 'legacy log docs removed');
assert(d.settings.schema === 2, 'schema flag set');
reads = 0; d = await st.loadAll();
assert(d.logs.length === 300, 'reload after migration: 300 logs');
console.log('     reads for a reload with 300 logs:', reads, '(was ~302 in schema 1)');
assert(reads <= 6, 'reload costs a handful of reads');
await st.addLog({ id:'new1', catId:'a', date:'2026-10-07', minutes:25 });
d = await st.loadAll(); assert(d.logs.length === 301 && d.logs.some(l => l.id === 'new1'), 'addLog merges into month doc');
await st.deleteLog({ id:'new1', date:'2026-10-07' });
d = await st.loadAll(); assert(d.logs.length === 300 && !d.logs.some(l => l.id === 'new1'), 'deleteLog removes only that entry');
await st.deleteCategory('a');
d = await st.loadAll(); assert(d.logs.length === 150 && d.logs.every(l => l.catId === 'b') && d.categories.length === 1, 'deleteCategory removes its logs + category');
await st.replaceAll({ categories:[{id:'z'}], logs:[{id:'q',catId:'z',date:'2026-07-01',minutes:5}], settings:{seeded:true} });
d = await st.loadAll(); assert(d.logs.length === 1 && d.categories.length === 1 && d.settings.schema === 2, 'replaceAll wipes and rewrites');
await st.deleteAccount();
assert([...db.keys()].filter(k => k.startsWith('users/u1')).length === 0 && authDeleted, 'deleteAccount removes all data then the auth user');
