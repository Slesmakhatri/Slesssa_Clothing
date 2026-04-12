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

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setStatus('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      await createVendorApplication(payload);
      setStatus('Vendor application submitted successfully. Admin review is required before vendor signup.');
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
      setStatus(error?.payload?.detail || 'Could not submit vendor application right now.');
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
                    <input className="form-control premium-input" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Email</label>
                    <input className="form-control premium-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Phone</label>
                    <input className="form-control premium-input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Business / Shop Name</label>
                    <input className="form-control premium-input" value={form.business_name} onChange={(event) => updateField('business_name', event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Specialization</label>
                    <input className="form-control premium-input" value={form.specialization} onChange={(event) => updateField('specialization', event.target.value)} placeholder="Ready-made fashion, tailoring, bridal wear..." />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Location</label>
                    <input className="form-control premium-input" value={form.location} onChange={(event) => updateField('location', event.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Business Description</label>
                    <textarea className="form-control premium-input premium-textarea" rows="4" value={form.business_description} onChange={(event) => updateField('business_description', event.target.value)} />
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
