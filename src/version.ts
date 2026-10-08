// The build this copy of the app came from (see vite.config.ts), and how to describe it.

export interface Build { version: string; commit: string; builtAt: string }

export const BUILD: Build = __BUILD__;

/** "TikTym 1.0.0 · 63836b6 · 8 Oct 2026" */
export function buildLabel(b: Build = BUILD): string {
  const date = new Date(b.builtAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `TikTym ${b.version} · ${b.commit} · ${date}`;
}

/** True when `live` is a different build from this one: a new version, or the same version rebuilt from other code. */
export const isDifferentBuild = (live: Pick<Build, 'version' | 'commit'>, own: Build = BUILD) =>
  live.version !== own.version || live.commit !== own.commit;
