import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, fetchProfile, getStoredUser, loginUser, loginWithGoogle as loginWithGoogleRequest, registerUser, updateProfile } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    function handleAuthChanged(event) {
      setUser(event.detail || getStoredUser());
    }

    window.addEventListener('slessaa:auth-changed', handleAuthChanged);
    return () => window.removeEventListener('slessaa:auth-changed', handleAuthChanged);
  }, []);

  useEffect(() => {
    function handleAuthRequired(event) {
      setUser(null);
      if (location.pathname === '/login') return;
      navigate('/login', {
        replace: true,
        state: {
          from: location.pathname,
          message: event.detail?.message || 'Please log in to continue.'
        }
      });
    }

    window.addEventListener('slessaa:auth-required', handleAuthRequired);
    return () => window.removeEventListener('slessaa:auth-required', handleAuthRequired);
  }, [location.pathname, navigate]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return undefined;
    }

    fetchProfile()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        if (active) {
          clearAuthSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      async login(credentials) {
        const response = await loginUser(credentials);
        setUser(response.user);
        return response;
      },
      async signup(payload) {
        return registerUser(payload);
      },
      async loginWithGoogle(payload) {
        const response = await loginWithGoogleRequest(payload);
        setUser(response.user);
        return response;
      },
      async saveProfile(payload) {
        const profile = await updateProfile(payload);
        setUser(profile);
        return profile;
      },
      logout() {
        clearAuthSession();
        setUser(null);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
