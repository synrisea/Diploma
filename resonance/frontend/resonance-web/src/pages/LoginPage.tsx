import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

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
    <div className="flex flex-1 items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-md border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-stone-900">{mode === 'login' ? 'Log in' : 'Create an account'}</h1>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              required
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded border border-stone-300 px-3 py-2 text-sm focus:outline-2 focus:outline-rose-700"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-stone-300 px-3 py-2 text-sm focus:outline-2 focus:outline-rose-700"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-stone-300 px-3 py-2 text-sm focus:outline-2 focus:outline-rose-700"
          />

          {error && <p className="text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-3 text-sm text-stone-500 hover:text-stone-900"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
