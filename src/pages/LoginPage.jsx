import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({
    type: location.state?.message ? 'error' : '',
    message: location.state?.message || ''
  });
  const [submitting, setSubmitting] = useState(false);

  function getPostLoginDestination(role = 'customer') {
    const from = location.state?.from;
    if (from && from !== '/login') return from;
    if (role === 'super_admin') return '/dashboard/super-admin';
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'vendor') return '/dashboard/vendor';
    if (role === 'tailor') return '/dashboard/tailor';
    return '/dashboard/customer';
  }

  function handleGoogleSuccess(response) {
    const role = response.user?.role || 'customer';
    const destination = getPostLoginDestination(role);
    setStatus({ type: 'success', message: 'Google login successful. Redirecting to your dashboard...' });
    window.setTimeout(() => navigate(destination), 900);
  }

  function handleGoogleError(error) {
    const payload = error?.payload || {};
    setStatus({
      type: 'error',
      message: payload.detail || error.message || 'Google login failed.'
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus({ type: '', message: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    if (!form.password) nextErrors.password = 'Password is required.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    setStatus({ type: '', message: '' });

    try {
      const response = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password
      });
      setStatus({ type: 'success', message: 'Login successful. Redirecting to your dashboard...' });
      const role = response.user?.role || 'customer';
      const destination = getPostLoginDestination(role);
      window.setTimeout(() => navigate(destination), 900);
    } catch (error) {
      const responseData = error.response?.data || error.payload || {};
      const responseStatus = error.response?.status || error.status;

      if (import.meta.env.DEV) {
        console.error('Login failed with status:', responseStatus);
        console.error('Login error response:', responseData);
      }

      setErrors({
        email: responseData.username?.[0] || responseData.email?.[0] || '',
        password: responseData.password?.[0] || ''
      });
      setStatus({
        type: 'error',
        message:
          responseData.detail ||
          responseData.username?.[0] ||
          responseData.email?.[0] ||
          responseData.password?.[0] ||
          responseData.message ||
          'Login failed. Check your credentials and backend status.'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="container">
        <div className="auth-shell">
          <div className="auth-visual">
            <div className="auth-overlay">
              <span className="section-eyebrow">Slessaa Member Access</span>
              <h1>Return to your premium fashion dashboard</h1>
              <p>Secure sign-in for shopping, tailoring requests, and order management.</p>
            </div>
          </div>
          <form className="auth-form-panel" onSubmit={handleSubmit}>
            <h2>Login</h2>
            <p className="auth-subcopy">Sign in with your Slessaa account to continue to checkout and order tracking.</p>
            {status.message && <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'}`}>{status.message}</div>}
            <div className="mb-3">
              <label className="premium-label">Email</label>
              <input className={`form-control premium-input ${errors.email ? 'is-invalid' : ''}`} type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
            </div>
            <div className="mb-3">
              <label className="premium-label">Password</label>
              <input className={`form-control premium-input ${errors.password ? 'is-invalid' : ''}`} type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" />
              {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
            </div>
            <div className="d-flex justify-content-between align-items-center small mb-4">
              <label><input type="checkbox" className="me-2" />Remember me</label>
              <a href="/" onClick={(event) => event.preventDefault()}>Forgot password?</a>
            </div>
            <button className="btn btn-slessaa btn-slessaa-primary w-100 mb-3" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Logging In...
                </>
              ) : 'Login'}
            </button>
            <div className="social-stack">
              <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            </div>
            <p className="mt-4 mb-0 text-center">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
