import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgot, setForgot] = useState(false);

  const valid = /\S+@\S+\.\S+/.test(email) && (forgot || password.length >= 6);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (forgot) {
        const err = await resetPassword(email.trim());
        if (err) setError(err.message);
        else setNotice('If that account exists, a reset link has been sent to your inbox.');
      } else if (mode === 'signup') {
        const { error: err, needsConfirmation } = await signUp(email.trim(), password);
        if (err) {
          setError(err.message);
        } else if (needsConfirmation) {
          setNotice('Check your inbox to confirm your email, then sign in.');
          setMode('signin');
        } else {
          setMode('signin');
          setNotice('Account created — you are signed in.');
        }
      } else {
        const err = await signIn(email.trim(), password);
        if (err) setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>Welcome to Focusly</h1>
          <p>Your tasks, reminders and focus timer — synced to the cloud.</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setForgot(false); setError(''); setNotice(''); }}>
            Sign in
          </button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setForgot(false); setError(''); setNotice(''); }}>
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {!forgot && (
            <label className="auth-field">
              <span>Email</span>
              <div className="input-icon">
                <Mail size={15} />
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </label>
          )}

          {!forgot && (
            <label className="auth-field">
              <span>Password</span>
              <div className="input-icon">
                <Lock size={15} />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
          )}

          {!forgot && mode === 'signin' && (
            <button type="button" className="auth-link" onClick={() => setForgot(true)}>
              Forgot password?
            </button>
          )}
          {forgot && (
            <button type="button" className="auth-link" onClick={() => setForgot(false)}>
              ← Back to sign in
            </button>
          )}

          {error && (
            <div className="auth-alert error">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
          {notice && (
            <div className="auth-alert notice">
              <CheckCircle2 size={15} />
              {notice}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !valid}>
            {busy ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
            {busy
              ? 'Please wait…'
              : forgot
                ? 'Send reset link'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="auth-foot">Secured with Supabase Auth · Email confirmation protects your data.</p>
      </div>
    </div>
  );
}
