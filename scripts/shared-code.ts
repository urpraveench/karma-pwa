// The app's backlog rules, shared with the Cloud Functions so a reminder or the app badge counts exactly what Today
// shows (NOTIF-10). The functions are deployed on their own, so they get a generated copy in functions/src/shared/:
// `npm run functions:shared` writes it (also before every functions deploy); a unit test fails if it's out of date.

/** The files copied, from src/lib/. They may only import each other. */
export const SHARED = ['backlog', 'date', 'util', 'types', 'reminders'] as const;

/** A file as the functions need it: a do-not-edit note, and './date' imports spelled './date.js' (Node's ES modules need the extension). */
export function forFunctions(name: string, source: string): string {
  const body = source.replace(/(from '\.\/)([a-z]+)(')/gi, (_m, a, file, b) => {
    if (!(SHARED as readonly string[]).includes(file)) throw new Error(`src/lib/${name}.ts imports ./${file}, which isn't shared`);
    return `${a}${file}.js${b}`;
  });
  return `// Generated from src/lib/${name}.ts by \`npm run functions:shared\`. Don't edit: change src/lib/${name}.ts and run it again.\n${body}`;
}
