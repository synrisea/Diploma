import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/layout/Logo';

const inputClass =
  'rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';

export function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = mode === 'login' ? await login(email, password) : await register(email, password, displayName);
      setAuth(response);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 82% 15%, rgba(255,106,57,0.14), transparent 55%), var(--color-ground)',
        }}
        aria-hidden="true"
      />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="82%" cy="15%" r="90" fill="none" stroke="#f2ebe0" strokeOpacity="0.07" strokeWidth="1" />
        <circle cx="82%" cy="15%" r="165" fill="none" stroke="#f2ebe0" strokeOpacity="0.05" strokeWidth="1" />
        <circle cx="82%" cy="15%" r="240" fill="none" stroke="#f2ebe0" strokeOpacity="0.035" strokeWidth="1" />
        <circle className="signal-ring" cx="82%" cy="15%" r="90" fill="none" stroke="#ff6a39" strokeWidth="1" />
      </svg>

      <div className="relative z-10 hidden flex-1 flex-col justify-center gap-8 px-16 py-16 lg:flex">
        <span className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-brand-500">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_1px_rgba(255,106,57,0.7)]" />
          Baku - community preview
        </span>

        <h1 className="max-w-lg font-display text-4xl leading-[1.08] text-balance text-stone-900 xl:text-5xl">
          Don’t trust the star rating. See what it’s actually like.
        </h1>

        <p className="max-w-sm text-[15px] leading-relaxed text-stone-500">
           Know a place before you go - from the people who've been there.
        </p>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 lg:w-[28rem] lg:flex-none">
        <div className="w-full max-w-sm rounded-[2rem] border border-stone-900/10 bg-stone-900/[0.03] p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <div className="rounded-[calc(2rem-0.375rem)] bg-ground-2/90 px-7 py-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="mb-6 flex items-center gap-2 text-brand-500 lg:hidden">
              <Logo className="h-6 w-6" />
              <span className="font-display text-base uppercase tracking-[0.03em] text-stone-900">Resonance</span>
            </div>

            <h2 className="font-display text-2xl text-stone-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1.5 text-sm text-stone-500">
              {mode === 'login' ? 'Log in to leave a signal on a place.' : 'Join the community leaving signals on places.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
              {mode === 'register' && (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-stone-700">Name</span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-stone-700">Email</span>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-stone-700">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <span className="font-mono text-[11px] text-stone-500">Minimum 8 characters</span>
              </label>

              {error && (
                <p className="rounded-xl border border-sentiment-negative/25 bg-sentiment-negative/10 px-3 py-2 text-sm text-sentiment-negative">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative mt-1 flex items-center justify-center gap-2 rounded-full bg-brand-500 py-1.5 pr-1.5 pl-1.5 text-sm font-medium text-brand-ink transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <span>{isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15 text-xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
                  ↗
                </span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="mt-5 text-sm text-stone-500 hover:text-stone-900"
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-medium text-brand-600">{mode === 'login' ? 'Register' : 'Log in'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
