import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  accountType: 'customer'
};

function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const accountOptions = useMemo(
    () => [
      { value: 'customer', label: 'Customer' },
      { value: 'tailor', label: 'Tailor' }
    ],
    []
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus({ type: '', message: '' });
  }

  function validateForm() {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!form.phone.trim()) nextErrors.phone = 'Phone is required.';
    if (!/^\+?[0-9\s-]{7,15}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone number.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.password) nextErrors.password = 'Password is required.';
    if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      await signup(form);
      setStatus({
        type: 'success',
        message: 'Account created successfully. Redirecting to login...'
      });
      setForm(initialForm);
      window.setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      const payload = error.payload || {};
      setSubmitting(false);
      setErrors({
        name: payload.name?.[0] || '',
        phone: payload.phone?.[0] || '',
        email: payload.email?.[0] || '',
        password: payload.password?.[0] || '',
        confirmPassword: payload.confirm_password?.[0] || ''
      });
      setStatus({ type: 'error', message: payload.detail || payload.message || 'Could not create account.' });
      return;
    }

    setSubmitting(false);
  }

  function handleGoogleSuccess(response) {
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
    setStatus({
      type: 'success',
      message: response.created ? 'Google account created successfully. Redirecting...' : 'Google login successful. Redirecting...'
    });
    window.setTimeout(() => navigate(destination), 900);
  }

  function handleGoogleError(error) {
    const payload = error?.payload || {};
    setStatus({
      type: 'error',
      message: payload.detail || error.message || 'Google signup failed.'
    });
  }

  return (
    <section className="auth-page">
      <div className="container">
        <div className="auth-shell reverse">
          <form className="auth-form-panel" onSubmit={handleSubmit} noValidate>
            <h2>Create Account</h2>
            <p className="auth-subcopy">Create a real account for shopping, tailoring, and role-based dashboards.</p>

            {status.message && (
              <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'}`}>{status.message}</div>
            )}

            <div className="row g-3">
              <div className="col-md-6">
                <label className="premium-label">Name</label>
                <input className={`form-control premium-input ${errors.name ? 'is-invalid' : ''}`} name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
                {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
              </div>
              <div className="col-md-6">
                <label className="premium-label">Phone</label>
                <input className={`form-control premium-input ${errors.phone ? 'is-invalid' : ''}`} name="phone" value={form.phone} onChange={handleChange} placeholder="+977 98XXXXXXXX" />
                {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
              </div>
              <div className="col-12">
                <label className="premium-label">Email</label>
                <input className={`form-control premium-input ${errors.email ? 'is-invalid' : ''}`} name="email" value={form.email} onChange={handleChange} type="email" placeholder="you@example.com" />
                {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
              </div>
              <div className="col-md-6">
                <label className="premium-label">Password</label>
                <input className={`form-control premium-input ${errors.password ? 'is-invalid' : ''}`} name="password" value={form.password} onChange={handleChange} type="password" placeholder="Password" />
                {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
              </div>
              <div className="col-md-6">
                <label className="premium-label">Confirm Password</label>
                <input className={`form-control premium-input ${errors.confirmPassword ? 'is-invalid' : ''}`} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password" placeholder="Confirm password" />
                {errors.confirmPassword && <div className="invalid-feedback d-block">{errors.confirmPassword}</div>}
              </div>
              <div className="col-12">
                <label className="premium-label">Account Type</label>
                <select className="form-select premium-input" name="accountType" value={form.accountType} onChange={handleChange}>
                  {accountOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn btn-slessaa btn-slessaa-primary w-100 mt-4 mb-3" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : 'Sign Up'}
            </button>

            <div className="social-stack">
              <GoogleSignInButton accountType={form.accountType} label="Sign up with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            </div>

            <div className="alert alert-secondary mt-3 mb-0">
              Vendor access is application-based. Use the public <Link to="/apply-vendor">Apply as Vendor</Link> flow first, then sign up after admin approval.
            </div>

            <p className="mt-4 mb-0 text-center">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
          <div className="auth-visual signup-visual">
            <div className="auth-overlay">
              <span className="section-eyebrow">Join Slessaa</span>
              <h1>Build your profile for shopping, tailoring, and recommendations</h1>
              <p>Create one account to manage orders, measurements, saved items, and style preferences.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SignupPage;
