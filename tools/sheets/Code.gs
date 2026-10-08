/**
 * TikTym usage totals → Google Sheets (STAT-04).
 *
 * Pulls the anonymous daily totals (Firestore stats/{yyyy-mm-dd}) into this spreadsheet:
 *   Daily totals  one row per day (missing days as zeros), derived columns, and a Notes column you type into
 *   Weekly        totals per week (Monday to Sunday) with the change from the week before
 *   Charts        starter charts, made once (edit or add your own)
 * Reads with your Google login, as the project owner, so the app's security rules stay as they are.
 * Setup: tools/sheets/README.md. Functions ending in _ are pure, so they're tested in tests/sheets.test.ts.
 */

const PROJECT_ID = 'tiktym';
const TIME_ZONE = 'Asia/Kolkata';
const DAILY = 'Daily totals', WEEKLY = 'Weekly', CHARTS = 'Charts';

// Counter fields in stats/{date}, in column order, with their column titles (keep in step with src/lib/stats.ts).
const COUNTERS = [
  ['activeDevices', 'Active devices'], ['signUps', 'Sign-ups'], ['logs', 'Entries'], ['minutes', 'Minutes'],
  ['timersStarted', 'Timers started'], ['timersReachedTarget', 'Timers reaching target'],
  ['logQuick', 'Logged: quick tap'], ['logTile', 'Logged: tile'], ['logAllLeft', "Logged: all that's left"],
  ['logCustom', 'Logged: custom'], ['logTimer', 'Logged: timer'], ['logOther', 'Logged: other'],
  ['practicesAdded', 'Practices added'], ['cardsShared', 'Cards shared'],
];
const DERIVED = ['Hours', 'Entries per active device', 'Timer completion %'];

// ---------- menu, refresh and schedule ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TikTym').addItem('Refresh now', 'refresh').addItem('Refresh every morning', 'installDailyTrigger').addToUi();
}

/** Fetches every stats document and rewrites the Daily totals and Weekly tabs, keeping your notes. */
function refresh() {
  const docs = fetchStats_();
  const today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const daily = book.getSheetByName(DAILY) || book.insertSheet(DAILY);
  const notes = readNotes_(daily.getDataRange().getValues());
  const rows = buildDailyRows_(parseStatsDocs_(docs), today, notes);
  writeTable_(daily, dailyHeader_(), rows);
  const weekly = book.getSheetByName(WEEKLY) || book.insertSheet(WEEKLY);
  writeTable_(weekly, weeklyHeader_(), buildWeeklyRows_(rows));
  if (!book.getSheetByName(CHARTS)) buildCharts_(book, daily, weekly);
  book.setActiveSheet(daily);
}

/** Refreshes every morning at about 7 am. Run once; running it again doesn't add a second one. */
function installDailyTrigger() {
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction() === 'refresh') ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('refresh').timeBased().everyDays(1).atHour(7).inTimezone(TIME_ZONE).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('TikTym totals will refresh every morning.');
}

// ---------- Firestore ----------

/** All stats documents, following pages. Uses the signed-in Google account (needs the datastore scope). */
function fetchStats_() {
  const base = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stats?pageSize=300';
  const headers = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  const docs = [];
  let token = '';
  do {
    const res = UrlFetchApp.fetch(base + (token ? '&pageToken=' + encodeURIComponent(token) : ''), { headers, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Firestore said ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
    const body = JSON.parse(res.getContentText());
    docs.push(...(body.documents || []));
    token = body.nextPageToken || '';
  } while (token);
  return docs;
}

// ---------- pure helpers (tested) ----------

/** Firestore REST documents → { 'yyyy-mm-dd': { counter: number } }. Ignores documents not named like a date. */
function parseStatsDocs_(docs) {
  const out = {};
  for (const d of docs) {
    const day = String(d.name || '').split('/').pop();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const counts = {};
    for (const [k, v] of Object.entries(d.fields || {})) counts[k] = Number(v.integerValue ?? v.doubleValue ?? 0);
    out[day] = counts;
  }
  return out;
}

function dailyHeader_() { return ['Date', ...COUNTERS.map(c => c[1]), ...DERIVED, 'Notes']; }

/** One row per day from the first day with data to `today`, zeros for gaps, derived columns, and kept notes. */
function buildDailyRows_(byDay, today, notes) {
  const days = Object.keys(byDay).sort();
  if (!days.length) return [];
  const rows = [];
  const end = today > days[days.length - 1] ? today : days[days.length - 1];
  for (let d = days[0]; d <= end; d = nextDay_(d)) {
    const c = byDay[d] || {};
    const n = k => c[k] || 0;
    rows.push([d, ...COUNTERS.map(([k]) => n(k)), ...derived_(n('minutes'), n('logs'), n('activeDevices'), n('timersStarted'), n('timersReachedTarget')), (notes && notes[d]) || '']);
  }
  return rows;
}

function weeklyHeader_() { return ['Week starting (Monday)', ...COUNTERS.map(c => c[1]), ...DERIVED, 'Entries vs previous week %']; }

/** Sums daily rows into Monday-based weeks, with the change in entries from the previous week. */
function buildWeeklyRows_(dailyRows) {
  const idx = name => dailyHeader_().indexOf(name);
  const weeks = new Map();
  for (const r of dailyRows) {
    const wk = mondayOf_(r[0]);
    if (!weeks.has(wk)) weeks.set(wk, COUNTERS.map(() => 0));
    const sums = weeks.get(wk);
    COUNTERS.forEach((_, i) => { sums[i] += Number(r[1 + i]) || 0; });
  }
  const out = [];
  let prevLogs = null;
  for (const [wk, sums] of [...weeks.entries()].sort()) {
    const get = name => sums[idx(name) - 1];
    const logs = get('Entries');
    const change = prevLogs ? Math.round((logs - prevLogs) / prevLogs * 100) : '';
    out.push([wk, ...sums, ...derived_(get('Minutes'), logs, get('Active devices'), get('Timers started'), get('Timers reaching target')), change]);
    prevLogs = logs;
  }
  return out;
}

function derived_(minutes, logs, devices, started, reached) {
  return [Math.round(minutes / 6) / 10, devices ? Math.round(logs / devices * 10) / 10 : 0, started ? Math.round(reached / started * 100) : 0];
}

/** Notes you typed, by date, from the current Daily totals values (first row is the header). */
function readNotes_(values) {
  const out = {};
  if (!values || values.length < 2) return out;
  const col = values[0].indexOf('Notes');
  if (col < 0) return out;
  for (const r of values.slice(1)) {
    const day = r[0] instanceof Date ? isoDate_(r[0]) : String(r[0]);
    if (r[col]) out[day] = r[col];
  }
  return out;
}

function nextDay_(day) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
function mondayOf_(day) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); }
function isoDate_(d) { return Utilities.formatDate(d, TIME_ZONE, 'yyyy-MM-dd'); }

// ---------- sheet writing and charts ----------

function writeTable_(sheet, header, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  // format first: Sheets turns 2026-10-08 into a date as it's written, which charts and notes then misread
  sheet.getRange(2, 1, Math.max(rows.length, 1), 1).setNumberFormat('@');
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
}

function buildCharts_(book, daily, weekly) {
  const charts = book.insertSheet(CHARTS);
  const add = (type, source, header, title, names, top) => {
    const rows = Math.max(source.getLastRow(), 2);
    let b = charts.newChart().setChartType(type).setNumHeaders(1).addRange(source.getRange(1, 1, rows, 1));
    for (const name of names) b = b.addRange(source.getRange(1, header.indexOf(name) + 1, rows, 1));
    charts.insertChart(b.setOption('title', title).setOption('legend', { position: names.length > 1 ? 'bottom' : 'none' })
      .setOption('width', 900).setOption('height', 320).setPosition(top, 1, 0, 0).build());
  };
  add(Charts.ChartType.LINE, daily, dailyHeader_(), 'Active devices and sign-ups per day', ['Active devices', 'Sign-ups'], 1);
  add(Charts.ChartType.LINE, daily, dailyHeader_(), 'Entries per day', ['Entries'], 18);
  add(Charts.ChartType.LINE, daily, dailyHeader_(), 'Timers started and reaching target', ['Timers started', 'Timers reaching target'], 35);
  add(Charts.ChartType.COLUMN, weekly, weeklyHeader_(), 'Entries per week', ['Entries'], 52);
}
