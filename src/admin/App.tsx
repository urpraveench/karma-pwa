import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { adminView, type AdminView } from './access';
import { auth } from './firebase';

const signInError = (e: unknown) => {
  const code = (e as { code?: string })?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/popup-blocked') return 'The browser blocked the Google window. Allow pop-ups for this site, then try again.';
  return `Sign-in didn't work (${code || String(e)}).`;
};

export function App() {
  const [view, setView] = useState<AdminView>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);

  // A fresh token on every sign-in, so a claim granted or removed since the last one counts straight away.
  useEffect(() => onAuthStateChanged(auth, async u => {
    setView(adminView(u, u ? (await u.getIdTokenResult(true)).claims : null));
  }), []);

  const google = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, provider); } catch (e) { setError(signInError(e)); }
  };

  if (view.kind === 'loading') return <main className="center" aria-busy="true"><p className="muted">Loading…</p></main>;

  if (view.kind === 'signed-out') return (
    <main className="center">
      <h1>TikTym admin</h1>
      <button className="btn primary" onClick={google}>Sign in with Google</button>
      {error && <p className="error" role="alert">{error}</p>}
    </main>
  );

  if (view.kind === 'not-admin') return (
    <main className="center">
      <h1>TikTym admin</h1>
      <p>This account isn't an admin.</p>
      <p className="muted">{view.email}</p>
      <button className="btn" onClick={() => signOut(auth)}>Sign out</button>
    </main>
  );

  return (
    <div className="shell">
      <header className="bar">
        <b>TikTym admin</b>
        <span className="who">{view.email}</span>
        <button className="btn small" onClick={() => signOut(auth)}>Sign out</button>
      </header>
      <main className="page">
        <h2>Admin console</h2>
        <p className="muted">Metrics, emails, push and costs come here as each page is built (to-do.md › Admin console).</p>
      </main>
    </div>
  );
}
