import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGoogleCode } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const code = searchParams.get('code');
    if (!code) return;

    exchangeGoogleCode(code)
      .then((response) => {
        setAuth(response);
        navigate('/');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'));
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      {error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="rounded-xl border border-sentiment-negative/25 bg-sentiment-negative/10 px-3 py-2 text-sm text-sentiment-negative">
            {error}
          </p>
          <Link to="/login" className="text-sm font-medium text-brand-600">
            Back to log in
          </Link>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Signing you in…</p>
      )}
    </div>
  );
}
