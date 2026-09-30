import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { enableDevGate, isSignedIn, safeNext, signIn } from '@/state/auth';
import './login.css';

/*
 * The sign-in page (plan 038): one card, no shell. It names no persona, role
 * or tenant; the persona menu stays the demo control once inside. Nothing
 * typed here is ever logged.
 */

const MISMATCH = "That email and password don't match. Check both and try again.";
const INSECURE = 'Sign-in needs a secure connection. Open the https address instead.';

export function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signedOut = (useLocation().state as { signedOut?: boolean } | null)?.signedOut === true;
  const next = safeNext(params.get('next'));
  // A dev tab that opens this page is gated from then on (a no-op in production).
  const [already] = useState(() => { enableDevGate(); return isSignedIn(); });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [passwordErr, setPasswordErr] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Sign in · Catalyst Tender AI';
    return () => { document.title = 'Catalyst Tender AI'; };
  }, []);

  if (already) return <Navigate replace to={next} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const noEmail = email.trim() === '';
    const noPassword = password === '';
    setEmailErr(noEmail);
    setPasswordErr(noPassword);
    setFormErr(null);
    if (noEmail || noPassword) {
      (noEmail ? emailRef : passwordRef).current?.focus();
      return;
    }
    setBusy(true);
    let ok = false;
    try {
      ok = await signIn(email, password);
    } catch {
      setBusy(false);
      setFormErr(INSECURE);
      return;
    }
    if (ok) {
      navigate(next, { replace: true });
      return;
    }
    setBusy(false);
    setPassword('');
    setFormErr(MISMATCH);
    passwordRef.current?.focus();
  };

  return (
    <div className="login">
      <main className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-mark" aria-hidden>C</span>
          <span style={{ minWidth: 0 }}>
            <span className="login-name">Catalyst Tender AI</span>
            <span className="login-tag">Tender workbench</span>
          </span>
        </div>

        <h1 id="login-title" className="login-title">Sign in</h1>
        <p className="login-sub">Use the details you were sent with this link.</p>
        {signedOut && <p className="login-note">You've signed out. Sign in again to carry on where you left off.</p>}

        <form className="login-form" onSubmit={submit} noValidate>
          <div className="fld">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email" ref={emailRef} type="email" autoComplete="username" autoFocus
              value={email} aria-invalid={emailErr || undefined} aria-describedby={emailErr ? 'login-email-err' : undefined}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(false); setFormErr(null); }}
            />
            {emailErr && <small id="login-email-err" className="login-err">Enter your email address.</small>}
          </div>

          <div className="fld">
            <label htmlFor="login-password">Password</label>
            <div className="login-pw">
              <input
                id="login-password" ref={passwordRef} type={show ? 'text' : 'password'} autoComplete="current-password"
                value={password} aria-invalid={passwordErr || undefined} aria-describedby={passwordErr ? 'login-password-err' : undefined}
                onChange={(e) => { setPassword(e.target.value); setPasswordErr(false); setFormErr(null); }}
              />
              <button
                type="button" className="login-show" aria-label="Show password" aria-pressed={show} aria-controls="login-password"
                onClick={() => setShow(!show)}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordErr && <small id="login-password-err" className="login-err">Enter the password.</small>}
          </div>

          {formErr && <p className="login-alert" role="alert">{formErr}</p>}
          <button type="submit" className="btn btn-primary login-submit" aria-busy={busy || undefined}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-help">No sign-in details? Ask the person who shared this link with you.</p>
      </main>
      <p className="login-foot">Prototype: indicative UI, illustrative data</p>
    </div>
  );
}
