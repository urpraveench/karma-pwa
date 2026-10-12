import { useEffect, useState, type FormEvent } from 'react';
import { track, trackScreen } from '../lib/analytics';
import { appCheckSiteKey, config, FIREBASE_READY } from '../config';
import { useApp } from '../state/app';
import { useFeedback } from '../ui/feedback';
import { GoogleLogo, Mark } from '../ui/icons';
import { reloadToLatest } from '../state/update';
import { buildLabel } from '../version';

/** `retry`: TikTym couldn't start or load the account (AUTH-22, FIRST-04), so the error comes with a Reload button. */
export function Login({ error: initialError = '', retry = false }: { error?: string; retry?: boolean }) {
  const { auth } = useApp();
  const { toast } = useFeedback();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(retry ? '' : initialError);
  const [reloading, setReloading] = useState(false);
  const testMode = !FIREBASE_READY, signup = !testMode && mode === 'signup';
  useEffect(() => { trackScreen('login'); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em || !password) { setError('Enter your email and password.'); return; }
    if (!auth) return;
    const err = signup ? await auth.signUp(em, password) : await auth.signIn(em, password);
    setError(err || '');
    if (!err) track(signup ? 'sign_up' : 'login', { method: 'email' });
  }

  async function reset() {
    const em = email.trim();
    if (!em) { setError('Enter your email above, then tap Forgot password again.'); return; }
    if (!auth) return;
    const err = await auth.resetPassword(em);
    setError(err || '');
    if (!err) toast('If that email has an account, a reset link is on its way.', 4500);
  }

  async function google() {
    const msg = auth ? await auth.google() : null;
    if (msg) toast(msg, 4200);
    else track('login', { method: 'google' });
  }

  return (
    <main className="login">
      <Mark className="mark" />
      <h1>TikTym</h1>
      <p className="lead">{signup ? 'Create your account. Pick your practices next, then log your first minute.' : '100 minutes a day for your productive life.'}</p>
      {retry && (
        <div className="start-err" role="alert">
          <p>{initialError}</p>
          <button className="btn" disabled={reloading} onClick={() => { setReloading(true); void reloadToLatest(); }}>{reloading ? 'Reloading…' : 'Reload'}</button>
        </div>
      )}
      {/* Signing in can't work until TikTym starts, so Reload is the only thing to tap (AUTH-22) */}
      {!retry && (
        <>
          {/* Google first: on most phones in India it's two taps and no typing (AUTH-30) */}
          <button className="btn gbtn" onClick={google}><GoogleLogo /> Continue with Google</button>
          <div className="or">or use your email</div>
          <form onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="em">Email</label>
              <input className="in" id="em" type="email" autoComplete={signup ? 'email' : 'username'} inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="field"><label htmlFor="pw">Password{signup ? ' (6+ characters)' : ''}</label>
              <input className="in" id="pw" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /></div>
            <p className="err" role="alert">{error}</p>
            <button className="btn btn-2" type="submit">{signup ? 'Create account' : 'Sign in'}</button>
          </form>
          {!testMode && (
            <div className="sheet-foot">
              <button className="link" onClick={() => { setMode(signup ? 'signin' : 'signup'); setError(''); }}>{signup ? 'I already have an account' : 'Create an account'}</button>
              {!signup && <button className="link" onClick={reset}>Forgot password?</button>}
            </div>
          )}
          {testMode && config.showDevHint && (
            <p className="devhint">Test mode: sign in with <b>{config.devCredentials.email}</b> and <b>{config.devCredentials.password}</b>. Data stays in this browser until Firebase is set up.</p>
          )}
        </>
      )}
      {/* What an account includes, said before it's created (LEGAL-07): the basis for on-by-default emails and statistics */}
      <p className="hint legal">By continuing you agree to the <a href={config.legal.terms}>Terms</a> and <a href={config.legal.privacy}>Privacy Policy</a>, including emails about your practice and usage statistics. You can turn either off in Setup or from any email.</p>
      {appCheckSiteKey() && (
        // Required by Google because App Check keeps the reCAPTCHA badge hidden
        <p className="hint recaptcha">This site is protected by reCAPTCHA, and the Google <a href="https://policies.google.com/privacy">Privacy Policy</a> and <a href="https://policies.google.com/terms">Terms of Service</a> apply.</p>
      )}
      <p className="build">{buildLabel()}</p>
    </main>
  );
}
