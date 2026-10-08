# TikTym usage totals in Google Sheets

Pulls the app's anonymous daily totals (Firestore `stats/{date}`) into a Google Sheet, with daily and weekly tabs and starter charts. It reads with **your** Google account, as the Firebase project owner, so the app's security rules don't change: apps still can't read the totals.

## Set up (about 10 minutes, once)

1. **Create a Sheet:** go to [sheets.new](https://sheets.new) while signed in to the Google account that owns the Firebase project. Name it, for example, "TikTym usage".
2. **Open Apps Script:** in the Sheet, **Extensions › Apps Script**.
3. **Paste the code:** replace everything in `Code.gs` with the contents of [`Code.gs`](Code.gs) from this folder. Save (⌘S).
4. **Paste the settings:** don't create a new file for this (Apps Script would name it `appsscript.json.gs`). The file already exists, hidden:
   - Click the **gear** (**Project Settings**) in the far-left sidebar and tick **Show "appsscript.json" manifest file in editor**.
   - Back in the editor (the `< >` icon), `appsscript.json` now appears in the file list. Open it, replace its contents with [`appsscript.json`](appsscript.json), and save.
   - It grants the script permission to read Firestore; without it, refresh fails with "Firestore said 403".
5. **Run it once:** choose `refresh` in the function list at the top and click **Run**. Google asks for permission:
   - **Review permissions** › choose your account.
   - Google warns that the app isn't verified. That's expected for your own script: **Advanced** › **Go to … (unsafe)** › **Allow**.
   It needs to read the Firestore database, edit this spreadsheet, and run on a schedule.
6. **Back in the Sheet:** you'll see **Daily totals**, **Weekly** and **Charts** tabs, and a **TikTym** menu (reload the Sheet if the menu isn't there yet).
7. **Refresh every morning:** **TikTym › Refresh every morning** (once).

## Using it

- **TikTym › Refresh now** at any time.
- Type in the **Notes** column on Daily totals ("LinkedIn post", "newsletter mention") to line your marketing up with the numbers. Notes are kept across refreshes.
- The **Charts** tab is made once; edit those charts or add your own. Delete the tab to have it made again.
- For a shareable dashboard, open [Looker Studio](https://lookerstudio.google.com), **Create › Data source › Google Sheets**, and pick this Sheet's Daily totals or Weekly tab.

## Columns

| Column | From |
|---|---|
| Active devices | Devices that opened TikTym that day (each once a day) |
| Sign-ups | New accounts (email and Google) |
| Entries, Minutes, Hours | Entries logged and their time |
| Timers started, Timers reaching target, Timer completion % | Focus timers |
| Logged: quick tap / tile / all that's left / custom / timer / other | How entries were logged |
| Practices added, Cards shared | New practices and shared progress cards |
| Entries per active device | Entries ÷ active devices |

Days with no data show as zeros, so charts don't skip them.

## When counters change

The counter list lives in three places, kept in step by `tests/sheets.test.ts`: `src/lib/stats.ts`, `firestore.rules` and `Code.gs`. After changing it, paste the new `Code.gs` into the Sheet's Apps Script.

## If something goes wrong

- **"Firestore said 403"**: either the `appsscript.json` settings weren't pasted (step 4), or the Google account running the script isn't an owner or editor of the `tiktym` Firebase project.
- **A file called `appsscript.json.gs`**: delete it (⋮ › Delete) and follow step 4 instead.
- **"Firestore said 404" or an empty sheet**: there's no data yet. Use the app (signed in) for a minute, then switch away from it so it saves, and refresh.
