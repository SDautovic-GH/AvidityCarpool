import React, { useState } from 'react';
import {
  auth,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '../firebase';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-3">
          <h1 className="text-xl font-bold">Avidity Carpool</h1>
          <p className="text-sm text-amber-400 font-medium">Firebase configuration needed</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Copy <code className="px-1.5 py-0.5 rounded bg-slate-800">.env.example</code> to{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-800">.env</code> and fill in your
            Firebase Web App keys, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await sendPasswordResetEmail(auth, cleanEmail);
        setMessage('Password reset email sent. Check your inbox (and spam folder).');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <img
            src="/volleyball.svg?v=4"
            alt="Avidity Carpool"
            className="w-10 h-10 shrink-0"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Avidity Carpool
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'signin'
                ? 'Sign in with your team email'
                : mode === 'signup'
                  ? 'First time? Set a password for your invited email'
                  : 'Send yourself a password reset link'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {error && <div className="text-xs text-rose-400">{error}</div>}
          {message && <div className="text-xs text-emerald-400">{message}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition disabled:opacity-50"
          >
            {busy
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                  ? 'Create Password & Sign In'
                  : 'Send Reset Email'}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          {mode !== 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
              className="text-blue-400 hover:underline"
            >
              Back to Sign In
            </button>
          )}
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                className="text-blue-400 hover:underline"
              >
                First-time sign up
              </button>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                className="text-slate-400 hover:text-slate-200"
              >
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
