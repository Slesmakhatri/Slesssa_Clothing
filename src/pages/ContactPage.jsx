import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SectionTitle from '../components/common/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { createSupportMessage } from '../services/api';

function ContactPage() {
  const location = useLocation();
  const { user } = useAuth();
  const initialVendorName = location.state?.vendorName || '';
  const initialProductName = location.state?.productName || '';
  const initialVendorUserId = location.state?.vendorUserId || null;
  const initialProductId = location.state?.productId || null;
  const userName = useMemo(() => user?.full_name || user?.name || user?.username || '', [user]);
  const userEmail = useMemo(() => user?.email || '', [user]);
  const [form, setForm] = useState({
    name: userName,
    email: userEmail,
    phone: '',
    subject: initialProductName ? `Question about ${initialProductName}` : 'General support request',
    message: '',
    target_type: initialVendorUserId ? 'vendor' : 'admin'
  });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || userName,
      email: current.email || userEmail,
      phone: current.phone || user?.phone || ''
    }));
  }, [userName, userEmail, user?.phone]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setStatus('');
    setStatusType('info');
  }

  function validateForm() {
    const errors = [];
    if (!form.name.trim()) errors.push('Name is required.');
    if (!form.email.trim()) errors.push('Email is required.');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.push('Enter a valid email address.');
    if (!form.subject.trim()) errors.push('Subject is required.');
    if (!form.message.trim()) errors.push('Message is required.');
    if (form.target_type === 'vendor' && !initialVendorUserId) errors.push('Vendor recipient is missing. Please open contact from a product/vendor link or use admin support.');
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validateForm();
    if (validationErrors.length) {
      setStatus(validationErrors.join(' '));
      setStatusType('danger');
      return;
    }

    setSubmitting(true);
    setStatus('');
    setStatusType('info');
    try {
      await createSupportMessage({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        vendor_user_id: initialVendorUserId,
        vendor_name: initialVendorName,
        product_id: initialProductId,
        product_name: initialProductName
      });
      setStatus(`Message sent successfully to ${initialVendorUserId ? initialVendorName || 'the vendor' : 'admin support'}.`);
      setStatusType('success');
      setForm((current) => ({ ...current, message: '', subject: initialProductName ? `Question about ${initialProductName}` : 'General support request' }));
    } catch (error) {
      setStatus(error?.message || error?.payload?.detail || 'Could not send your message right now.');
      setStatusType('danger');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Contact</span>
          <h1>{initialVendorUserId ? 'Contact this vendor' : 'Contact Slessaa support'}</h1>
          <p>
            {initialVendorUserId
              ? `Your message will be stored and routed to ${initialVendorName || 'the vendor'} for response.`
              : 'General support messages are stored for admin/support follow-up.'}
          </p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-5">
              <SectionTitle
                eyebrow="Support Flow"
                title="Stored messages with clear status tracking"
                text="Messages are saved in the backend and can be reviewed by admin or the intended vendor."
                align="start"
              />
              <article className="info-card">
                <p><strong>Destination:</strong> {initialVendorUserId ? (initialVendorName || 'Vendor inbox') : 'Admin support inbox'}</p>
                {initialProductName ? <p><strong>Product:</strong> {initialProductName}</p> : null}
                <p><strong>Status flow:</strong> new -&gt; read -&gt; replied -&gt; closed</p>
              </article>
            </div>
            <div className="col-lg-7">
              <form className="info-card d-grid gap-3" onSubmit={handleSubmit}>
                {status ? <div className={`alert alert-${statusType} mb-0`}>{status}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="premium-label">Name</label>
                    <input className="form-control premium-input" value={form.name} onChange={(event) => updateField('name', event.target.value)} required disabled={submitting} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Email</label>
                    <input className="form-control premium-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required disabled={submitting} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Phone</label>
                    <input className="form-control premium-input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} disabled={submitting} />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Subject</label>
                    <input className="form-control premium-input" value={form.subject} onChange={(event) => updateField('subject', event.target.value)} required disabled={submitting} />
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Message</label>
                    <textarea className="form-control premium-input premium-textarea" rows="5" value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="How can we help?" required disabled={submitting} />
                  </div>
                </div>
                <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={submitting}>
                  {submitting ? 'Sending Message...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
