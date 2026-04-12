import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import SectionTitle from '../components/common/SectionTitle';
import { createSupportMessage } from '../services/api';

function ContactPage() {
  const location = useLocation();
  const initialVendorName = location.state?.vendorName || '';
  const initialProductName = location.state?.productName || '';
  const initialVendorUserId = location.state?.vendorUserId || null;
  const initialProductId = location.state?.productId || null;
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: initialProductName ? `Question about ${initialProductName}` : 'General support request',
    message: '',
    target_type: initialVendorUserId ? 'vendor' : 'admin'
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
      await createSupportMessage({
        ...form,
        vendor_user_id: initialVendorUserId,
        vendor_name: initialVendorName,
        product_id: initialProductId,
        product_name: initialProductName
      });
      setStatus(`Message sent successfully to ${initialVendorUserId ? initialVendorName || 'the vendor' : 'admin support'}.`);
      setForm((current) => ({ ...current, message: '', subject: initialProductName ? `Question about ${initialProductName}` : 'General support request' }));
    } catch (error) {
      setStatus(error?.payload?.detail || 'Could not send your message right now.');
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
                <p><strong>Status flow:</strong> new → read → replied → closed</p>
              </article>
            </div>
            <div className="col-lg-7">
              <form className="info-card d-grid gap-3" onSubmit={handleSubmit}>
                {status ? <div className="alert alert-info mb-0">{status}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="premium-label">Name</label>
                    <input className="form-control premium-input" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
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
                    <label className="premium-label">Subject</label>
                    <input className="form-control premium-input" value={form.subject} onChange={(event) => updateField('subject', event.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Message</label>
                    <textarea className="form-control premium-input premium-textarea" rows="5" value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="How can we help?" />
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
