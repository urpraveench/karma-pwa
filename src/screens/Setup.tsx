import type { CSSProperties } from 'react';
import { config, feedbackLink, FIREBASE_READY } from '../config';
import { activeCats, byOrder, capDays, dueOn, targetOn } from '../lib/backlog';
import { fmtShort } from '../lib/date';
import { sum } from '../lib/util';
import { useApp } from '../state/app';
import { useTheme, type Theme } from '../state/theme';
import { Icon } from '../ui/icons';
import { BUILD } from '../version';
import { NotificationsPrivacy } from '../components/NotificationsPrivacy';
import { useInstall } from '../state/install';
import { practiceRemindTime, timeLabel } from '../lib/reminders';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayTxt = (d: number[]) => d.length === 7 ? 'every day' : d.length === 0 ? 'no days' : [1, 2, 3, 4, 5, 6, 0].filter(x => d.includes(x)).map(x => SHORT_DAYS[x]).join(', ');
const CAPS: [number, string][] = [[0, 'None'], [1, '1 day'], [2, '2 days'], [3, '3 days']];
const capSays = (n: number) => n ? `${n} day${n === 1 ? '' : 's'}` : 'no limit';
const THEMES: Theme[] = ['system', 'light', 'dark'];

export function Setup() {
  const { data, c: cx, T, user, openSheet, reorderCategory, setBacklogCap, loadSample, exportBackup, importBackup, startOver, signOut, deleteAccount } = useApp();
  const [theme, setTheme] = useTheme();
  const { env: installEnv } = useInstall();
  const cats = [...data.categories].sort(byOrder);
  const total = sum(activeCats(data.categories, T).map(c => dueOn(c, T)));
  const picked = capDays(data.settings), byLevel = cx.level ? cx.rule.cap : null, cap = picked ?? byLevel ?? 2;

  return (
    <>
      <header className="top"><div><p className="date">{total} points due on a day like today</p><h1 className="hello">Setup</h1></div></header>

      <div className="sect-h"><h2>Practices</h2><button className="chip" onClick={() => openSheet({ kind: 'editCat' })}>Add practice</button></div>
      <div className="list">
        {cats.length ? cats.map((c, i) => {
          const t = targetOn(c, T)!;
          return (
            <div className="li li-prac" key={c.id} style={{ '--c': c.color } as CSSProperties}>
              <button className="li-open" type="button" onClick={() => openSheet({ kind: 'editCat', id: c.id })}>
                <i />
                <span className="t">{c.name}{c.archivedFrom && <> <span className="badge">Archived</span></>}<small>{t.minutes} min {dayTxt(t.days)}, since {fmtShort(c.startDate)}{practiceRemindTime(c) && `, reminder at ${timeLabel(practiceRemindTime(c)!)}`}</small></span>
              </button>
              <span className="move">
                <button className="x" type="button" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => reorderCategory(c.id, -1)}><Icon.up /></button>
                <button className="x" type="button" aria-label={`Move ${c.name} down`} disabled={i === cats.length - 1} onClick={() => reorderCategory(c.id, 1)}><Icon.down /></button>
              </span>
            </div>
          );
        }) : <p className="li">No practices yet.</p>}
      </div>

      <div className="sect-h"><h2>Backlog limit</h2></div>
      <div className="seg seg-full" role="group" aria-label="Backlog limit">
        {byLevel !== null && <button onClick={() => setBacklogCap(-1)} aria-pressed={picked === null} aria-label="By level">Auto</button>}
        {CAPS.map(([v, l]) => <button key={v} onClick={() => setBacklogCap(v)} aria-pressed={(byLevel === null || picked !== null) && cap === v}
          aria-label={byLevel !== null ? l : undefined}>{byLevel !== null && v ? v : l}</button>)}
      </div>
      <p className="hint" style={{ textAlign: 'left', margin: '-6px 2px 22px' }}>The most each practice can carry into a new day, measured in days of its target. Misses beyond that are forgiven, so a bad week never becomes a hole you can't climb out of.{byLevel !== null && ` Auto follows your level: ${capSays(byLevel)} at Level ${cx.level!.level}.`}</p>

      <div className="sect-h"><h2>Appearance</h2></div>
      <div className="seg" role="group" aria-label="Theme">
        {THEMES.map(t => <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>

      <div className="sect-h"><h2>Data</h2></div>
      <div className="list">
        <button className="li" onClick={loadSample}><span className="t">Load sample data<small>Replaces everything with 10 weeks of practice data, for testing the backlog</small></span></button>
        <button className="li" onClick={exportBackup}><span className="t">Export as JSON<small>Download a backup of practices and logs</small></span></button>
        <label className="li" style={{ cursor: 'pointer' }}>
          <span className="t">Import from JSON<small>Replaces everything with a backup file</small></span>
          <input type="file" accept="application/json" className="sr" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importBackup(f); }} />
        </label>
      </div>

      <div className="sect-h"><h2>Account</h2>{FIREBASE_READY ? <span className="badge">Synced with Firebase</span> : <span className="badge test">Test mode</span>}</div>
      <div className="list">
        <div className="li"><span className="t">{user?.name || user?.email}<small>{user?.email || ''}</small></span></div>
        <button className="li" onClick={() => { if (confirm('Sign out?')) void signOut(); }}><span className="t">Sign out</span></button>
      </div>
      {!FIREBASE_READY && <p className="devhint">Test mode keeps data in this browser only. Set <b>VITE_BACKEND=firebase</b> and your Firebase keys in .env.local to sync across devices.</p>}

      <NotificationsPrivacy />

      <div className="sect-h"><h2>About</h2></div>
      <div className="list">
        {installEnv !== 'installed' && <button className="li" type="button" onClick={() => openSheet({ kind: 'install' })}><span className="t">Add TikTym to your home screen<small>It opens like an app, without an app store</small></span><span className="chev">›</span></button>}
        <div className="li about"><span className="t">TikTym {BUILD.version}<small>Build {BUILD.commit}, {new Date(BUILD.builtAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></span></div>
        <a className="li" href={config.whatsNew} target="_blank" rel="noopener"><span className="t">What's new<small>Every update, newest first</small></span><span className="chev">›</span></a>
        <a className="li" href={feedbackLink(BUILD)}><span className="t">Send feedback<small>Ideas, problems, anything. It goes straight to the people who build TikTym.</small></span><span className="chev">›</span></a>
        <a className="li" href={config.linkedin} target="_blank" rel="noopener"><span className="t">Follow TikTym on LinkedIn<small>Tips, updates and what's coming next</small></span><span className="chev">›</span></a>
        <a className="li" href={config.instagram} target="_blank" rel="noopener"><span className="t">Follow TikTym on Instagram<small>Short videos and ideas for your 100 minutes</small></span><span className="chev">›</span></a>
        <a className="li" href={config.legal.terms}><span className="t">Terms of Service</span><span className="chev">›</span></a>
        <a className="li" href={config.legal.privacy}><span className="t">Privacy Policy</span><span className="chev">›</span></a>
      </div>

      {/* Last on the page and set apart, so a tap meant for Sign out can't land here. */}
      <div className="sect-h danger-h"><h2>Danger zone</h2></div>
      <div className="list danger">
        <button className="li" onClick={startOver}><span className="t">Start over<small>Deletes all logs and resets the default practices</small></span></button>
        {FIREBASE_READY && <button className="li" onClick={() => void deleteAccount()}><span className="t">Delete account<small>Removes your account and all data permanently</small></span></button>}
      </div>
    </>
  );
}
