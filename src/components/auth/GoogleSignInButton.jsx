import { useEffect, useRef, useState } from 'react';
import { getGoogleAuthConfig, loginWithGoogle } from '../../services/api';

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

function GoogleSignInButton({ accountType = 'customer', label = 'Continue with Google', onSuccess, onError }) {
  const buttonRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    let active = true;

    async function setupGoogleButton() {
      try {
        const [google, config] = await Promise.all([loadGoogleScript(), getGoogleAuthConfig()]);
        const clientId = config?.client_id;

        if (!active || !clientId || !buttonRef.current) {
          if (active) setLoading(false);
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const payload = await loginWithGoogle({
                credential: response.credential,
                account_type: accountType
              });
              onSuccessRef.current?.(payload);
            } catch (error) {
              onErrorRef.current?.(error);
            }
          }
        });

        buttonRef.current.innerHTML = '';
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: label === 'Sign up with Google' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width: buttonRef.current.offsetWidth || 320
        });
      } catch (error) {
        onErrorRef.current?.(error);
      } finally {
        if (active) setLoading(false);
      }
    }

    setupGoogleButton();
    return () => {
      active = false;
    };
  }, [accountType, label]);

  return (
    <div>
      <div ref={buttonRef} style={{ width: '100%' }} />
      {loading && (
        <button type="button" className="btn btn-slessaa btn-slessaa-outline w-100" disabled>
          Loading Google...
        </button>
      )}
    </div>
  );
}

export default GoogleSignInButton;
