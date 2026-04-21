import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createVendorApplication } from '../services/api';

function ApplyVendorPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    business_description: '',
    specialization: '',
    location: ''
  });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setStatus('');
    setErrors((cur) => ({ ...cur, [name]: undefined }));
  }

  function validateEmail(email) {
    // simple email regex
    return /^\S+@\S+\.\S+$/.test(String(email || '').trim());
  }

  function validatePhone(phone) {
    // allow digits, spaces, +, -, () and min 7 digits
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  function validateForm() {
    const fieldErrors = {};
    if (!form.full_name?.trim()) fieldErrors.full_name = 'Full name is required';
    if (!form.email?.trim()) fieldErrors.email = 'Email is required';
    else if (!validateEmail(form.email)) fieldErrors.email = 'Enter a valid email address';
    if (!form.phone?.trim()) fieldErrors.phone = 'Phone is required';
    else if (!validatePhone(form.phone)) fieldErrors.phone = 'Phone number must be valid';
    if (!form.business_name?.trim()) fieldErrors.business_name = 'Business / shop name is required';
    if (!form.specialization?.trim()) fieldErrors.specialization = 'Specialization is required';
    if (!form.location?.trim()) fieldErrors.location = 'Location is required';
    if (!form.business_description?.trim()) fieldErrors.business_description = 'Business description is required';

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    // client-side validation
    if (!validateForm()) {
      // do not submit
      console.debug('Vendor application validation failed', errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      console.debug('Submitting vendor application', Object.fromEntries(payload.entries()));

      await createVendorApplication(payload);

      setStatus('Vendor application submitted successfully. Admin review is required before vendor signup.');
      setErrors({});
      setForm({
        full_name: '',
        email: '',
        phone: '',
        business_name: '',
        business_description: '',
        specialization: '',
        location: ''
      });
    } catch (error) {
      // log for debugging
      console.error('Vendor application submit error', error);

      const statusCode = error?.status;
      const payload = error?.payload;

      // Authentication error
      if (statusCode === 401) {
        setStatus('Please log in to submit a vendor application.');
        return;
      }

      // Server error
      if (!statusCode || statusCode >= 500) {
        setStatus('Server error. Please try again later.');
        return;
      }

      // Handle validation errors from backend (field-level)
      if (payload && typeof payload === 'object') {
        const fieldErrors = {};
        // payload may map field -> ["error"] or have non_field_errors or detail
        for (const [key, value] of Object.entries(payload)) {
          if (Array.isArray(value)) {
            fieldErrors[key] = value.join(' ');
          } else if (typeof value === 'string') {
            fieldErrors[key] = value;
          }
        }

        // common backend shapes: non_field_errors or detail
        if (fieldErrors.non_field_errors) {
          setStatus(fieldErrors.non_field_errors);
          delete fieldErrors.non_field_errors;
        } else if (payload.detail) {
          // specific messages like already applied
          const detail = payload.detail;
          if (typeof detail === 'string' && /already/i.test(detail)) {
            setStatus('You have already submitted a vendor application.');
          } else {
            setStatus(detail || error.message || 'Could not submit vendor application right now.');
          }
        }

        // map known field keys from backend to form fields
        const mapped = {};
        ['full_name','email','phone','business_name','specialization','location','business_description'].forEach((k) => {
          if (fieldErrors[k]) mapped[k] = fieldErrors[k];
        });

        setErrors((cur) => ({ ...cur, ...mapped }));
        // if no field-level message was set, show generic
        if (!mapped || Object.keys(mapped).length === 0) {
          if (!status) setStatus(error.message || 'Could not submit vendor application right now.');
        }
      } else {
        setStatus(error.message || 'Could not submit vendor application right now.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Vendor Onboarding</span>
          <h1>Apply as a Vendor</h1>
          <p>Apply publicly, get reviewed by admin, then complete your shop setup before selling on Slessaa.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-5">
              <div className="info-card h-100">
                <span className="section-eyebrow">How It Works</span>
                <h3>Clean approval-first workflow</h3>
                <ul className="ai-simple-list">
                  <li>Submit your vendor application with shop details.</li>
                  <li>Admin reviews and approves or rejects the application.</li>
                  <li>After approval, sign up and complete your shop profile.</li>
                  <li>Then add products and manage orders from the vendor dashboard.</li>
                </ul>
                <p className="mb-0">Already approved? <Link to="/signup">Create your vendor account</Link>.</p>
              </div>
            </div>
            <div className="col-lg-7">
              <form className="info-card d-grid gap-3" onSubmit={handleSubmit}>
                {status ? <div className="alert alert-info mb-0">{status}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="premium-label">Full Name</label>
                    <input className={`form-control premium-input ${errors.full_name ? 'is-invalid' : ''}`} value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
                    {errors.full_name ? <div className="form-text text-danger">{errors.full_name}</div> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Email</label>
                    <input className={`form-control premium-input ${errors.email ? 'is-invalid' : ''}`} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
                    {errors.email ? <div className="form-text text-danger">{errors.email}</div> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Phone</label>
                    <input className={`form-control premium-input ${errors.phone ? 'is-invalid' : ''}`} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
                    {errors.phone ? <div className="form-text text-danger">{errors.phone}</div> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Business / Shop Name</label>
                    <input className={`form-control premium-input ${errors.business_name ? 'is-invalid' : ''}`} value={form.business_name} onChange={(event) => updateField('business_name', event.target.value)} />
                    {errors.business_name ? <div className="form-text text-danger">{errors.business_name}</div> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Specialization</label>
                    <input className={`form-control premium-input ${errors.specialization ? 'is-invalid' : ''}`} value={form.specialization} onChange={(event) => updateField('specialization', event.target.value)} placeholder="Ready-made fashion, tailoring, bridal wear..." />
                    {errors.specialization ? <div className="form-text text-danger">{errors.specialization}</div> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Location</label>
                    <input className={`form-control premium-input ${errors.location ? 'is-invalid' : ''}`} value={form.location} onChange={(event) => updateField('location', event.target.value)} />
                    {errors.location ? <div className="form-text text-danger">{errors.location}</div> : null}
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Business Description</label>
                    <textarea className={`form-control premium-input premium-textarea ${errors.business_description ? 'is-invalid' : ''}`} rows="4" value={form.business_description} onChange={(event) => updateField('business_description', event.target.value)} />
                    {errors.business_description ? <div className="form-text text-danger">{errors.business_description}</div> : null}
                  </div>
                </div>
                <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={submitting}>
                  {submitting ? 'Submitting Application...' : 'Submit Vendor Application'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ApplyVendorPage;
