import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/layout/Logo';

const inputClass =
  'rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';

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
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden flex-1 flex-col justify-between bg-stone-900 px-12 py-12 text-white md:flex">
        <div className="flex items-center gap-2 text-brand-500">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight text-white">Resonance</span>
        </div>

        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-balance">
            Know a place before you go — from the people who've been there.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-stone-400">
            Community comments on noise, safety, wifi, and more — for every café, park, and
            restaurant in Baku's Torgovy district.
          </p>
        </div>

        <p className="text-xs text-stone-500">Baku · Torgovy — community preview</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 md:w-[26rem] md:flex-none">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 text-brand-500 md:hidden">
            <Logo className="h-6 w-6" />
            <span className="text-base font-semibold tracking-tight text-stone-900">Resonance</span>
          </div>

          <h1 className="text-2xl font-semibold text-stone-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {mode === 'login' ? 'Log in to leave comments on places.' : 'Join the community leaving comments on places.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
              <span className="text-xs text-stone-400">Minimum 8 characters</span>
            </label>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 rounded-md bg-brand-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
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
  );
}
