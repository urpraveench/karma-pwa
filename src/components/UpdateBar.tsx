import { useState } from 'react';
import { reloadToLatest, useNewerBuild } from '../state/update';
import { BUILD } from '../version';

/** "New version ready (1.0.1) · Reload", above every screen, when a newer build is live. */
export function UpdateBar() {
  const live = useNewerBuild();
  const [busy, setBusy] = useState(false);
  if (!live) return null;
  const name = live.version !== BUILD.version ? live.version : `${live.version} · ${live.commit}`;
  return (
    <div className="update-bar" role="status">
      <span>New version ready ({name})</span>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); void reloadToLatest(); }}>{busy ? 'Updating…' : 'Reload'}</button>
    </div>
  );
}
