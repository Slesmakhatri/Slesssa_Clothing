import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginWithGoogle } from '../services/api';

function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setMessage('Google sign-in was cancelled or denied.');
      return;
    }

    if (!code) {
      setMessage('Missing Google authorization code.');
      return;
    }

    loginWithGoogle({ code })
      .then((response) => {
        const role = response.user?.role || 'customer';
        const destination =
          role === 'super_admin'
            ? '/dashboard/super-admin'
            : role === 'admin'
            ? '/dashboard/admin'
            : role === 'vendor'
              ? '/dashboard/vendor'
              : role === 'tailor'
                ? '/dashboard/tailor'
                : '/dashboard/customer';
        navigate(destination, { replace: true });
      })
      .catch((requestError) => {
        const payload = requestError?.payload || {};
        setMessage(payload.detail || requestError.message || 'Google sign-in failed.');
      });
  }, [navigate, searchParams]);

  return (
    <section className="section-space">
      <div className="container">
        <div className="checkout-card mx-auto text-center" style={{ maxWidth: '640px' }}>
          <span className="section-eyebrow">Google Authentication</span>
          <h1>Signing you in</h1>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}

export default GoogleAuthCallbackPage;
