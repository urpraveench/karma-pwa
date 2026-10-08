import { useState, type FormEvent } from 'react';
import { appCheckSiteKey, config, FIREBASE_READY } from '../config';
import { useApp } from '../state/app';
import { useFeedback } from '../ui/feedback';
import { GoogleLogo, Mark } from '../ui/icons';
import { buildLabel } from '../version';

export function Login({ error: initialError = '' }: { error?: string }) {
  const { auth } = useApp();
  const { toast } = useFeedback();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const testMode = !FIREBASE_READY, signup = !testMode && mode === 'signup';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!em || !password) { setError('Enter your email and password.'); return; }
    if (!auth) return;
    setError((signup ? await auth.signUp(em, password) : await auth.signIn(em, password)) || '');
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
  }

  return (
    <main className="login">
      <Mark className="mark" />
      <h1>TikTym</h1>
      <p className="lead">{signup ? 'Create your account. Pick your practices next, then log your first minute.' : 'One minute, one point. Clear today, then clear what\'s carried.'}</p>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="em">Email</label>
          <input className="in" id="em" type="email" autoComplete={signup ? 'email' : 'username'} inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="pw">Password{signup ? ' (6+ characters)' : ''}</label>
          <input className="in" id="pw" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <p className="err" role="alert">{error}</p>
        <button className="btn" type="submit">{signup ? 'Create account' : 'Sign in'}</button>
      </form>
      {!testMode && (
        <div className="sheet-foot">
          <button className="link" onClick={() => { setMode(signup ? 'signin' : 'signup'); setError(''); }}>{signup ? 'I already have an account' : 'Create an account'}</button>
          {!signup && <button className="link" onClick={reset}>Forgot password?</button>}
        </div>
      )}
      <div className="or">or</div>
      <button className="btn gbtn" onClick={google}><GoogleLogo /> Continue with Google</button>
      {testMode && config.showDevHint && (
        <p className="devhint">Test mode: sign in with <b>{config.devCredentials.email}</b> and <b>{config.devCredentials.password}</b>. Data stays in this browser until Firebase is set up.</p>
      )}
      <p className="hint legal">By continuing you agree to the <a href={config.legal.terms}>Terms</a> and <a href={config.legal.privacy}>Privacy Policy</a>.</p>
      {appCheckSiteKey() && (
        // Required by Google because App Check keeps the reCAPTCHA badge hidden
        <p className="hint recaptcha">This site is protected by reCAPTCHA, and the Google <a href="https://policies.google.com/privacy">Privacy Policy</a> and <a href="https://policies.google.com/terms">Terms of Service</a> apply.</p>
      )}
      <p className="build">{buildLabel()}</p>
    </main>
  );
}
