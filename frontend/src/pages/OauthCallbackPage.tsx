import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { DEV_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from '../constants/auth';

const OauthCallbackPage = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const provider = params.get('provider') ?? 'wise';

    if (status === 'success') {
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');

      if (accessToken) {
        try {
          localStorage.setItem(DEV_TOKEN_STORAGE_KEY, accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`);
        } catch {
          // ignore storage failures
        }
      }

      if (refreshToken) {
        try {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        } catch {
          // ignore storage failures
        }
      }

      navigate('/dashboard', { replace: true });
      return;
    }

    const reason = params.get('reason') ?? 'OAuth handshake failed. Please try again.';
    setMessage(`Unable to complete ${provider} sign-in. ${reason}`);
    const timeout = window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
};

export default OauthCallbackPage;
