import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createTailoringMessage } from '../../services/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'stitching', label: 'Stitching' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'completed', label: 'Completed' }
];

function TailoringRequestThread({ request, onMessageCreated }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [form, setForm] = useState({
    body: '',
    designNotes: '',
    chest: '',
    waist: '',
    height: '',
    fabricPreference: '',
    colorPreference: '',
    priceEstimate: '',
    deliveryEstimate: '',
    statusSnapshot: '',
    attachment: null
  });

  const isTailor = user?.role === 'tailor' || user?.role === 'admin';
  const timeline = useMemo(() => request?.messages || [], [request]);

  if (!request) {
    return (
      <div className="tailoring-thread-empty">
        <h4>Select a tailoring request</h4>
        <p>Open a request to review measurements, reference images, and the communication thread.</p>
      </div>
    );
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage('');

    try {
      const payload = new FormData();
      payload.append('request', request.id);
      if (form.body) payload.append('body', form.body);
      if (form.designNotes) payload.append('design_notes', form.designNotes);
      if (form.fabricPreference) payload.append('fabric_preference', form.fabricPreference);
      if (form.colorPreference) payload.append('color_preference', form.colorPreference);
      if (form.priceEstimate) payload.append('price_estimate', form.priceEstimate);
      if (form.deliveryEstimate) payload.append('delivery_estimate', form.deliveryEstimate);
      if (form.statusSnapshot) payload.append('status_snapshot', form.statusSnapshot);
      if (form.attachment) payload.append('attachment', form.attachment);

      const measurementSnapshot = {};
      if (form.chest) measurementSnapshot.chest = form.chest;
      if (form.waist) measurementSnapshot.waist = form.waist;
      if (form.height) measurementSnapshot.height = form.height;
      if (Object.keys(measurementSnapshot).length) {
        payload.append('measurement_snapshot', JSON.stringify(measurementSnapshot));
      }

      await createTailoringMessage(payload);
      setForm({
        body: '',
        designNotes: '',
        chest: '',
        waist: '',
        height: '',
        fabricPreference: '',
        colorPreference: '',
        priceEstimate: '',
        deliveryEstimate: '',
        statusSnapshot: '',
        attachment: null
      });
      setStatusMessage('Update sent.');
      onMessageCreated?.();
    } catch {
      setStatusMessage('Could not send the update.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="tailoring-thread-shell">
      <div className="tailoring-thread-header">
        <div>
          <span className="section-eyebrow">Request Detail</span>
          <h3>{request.clothing_type}</h3>
          <p>
            Status: <strong>{request.status.replaceAll('_', ' ')}</strong>
          </p>
          {request.is_self_tailor ? (
            <p>
              Tailor: <strong>Custom Tailor</strong> {request.self_tailor_name ? `- ${request.self_tailor_name}` : ''} {request.self_tailor_phone ? `- ${request.self_tailor_phone}` : ''}
            </p>
          ) : request.tailor_profile_detail?.full_name || request.assigned_tailor_detail?.full_name ? (
            <p>
              Tailor: <strong>{request.tailor_profile_detail?.full_name || request.assigned_tailor_detail?.full_name || request.assigned_tailor_detail?.email}</strong>
            </p>
          ) : (
            <p>
              Assignment: <strong>Pending internal review</strong>
            </p>
          )}
          {request.reference_product_name ? (
            <p>
              Reference: <strong>{request.reference_product_name}</strong>
            </p>
          ) : null}
          {request.tailor_profile_detail?.location_name || request.tailor_profile_detail?.address || request.tailor_profile_detail?.city ? (
            <p>
              Studio: <strong>{request.tailor_profile_detail?.location_name || request.tailor_profile_detail?.address || request.tailor_profile_detail?.city}</strong>
            </p>
          ) : null}
        </div>
        <div className="tailoring-thread-meta">
          <span>Fabric: {request.fabric}</span>
          <span>Color: {request.color}</span>
          {request.standard_size ? <span>Size: {request.standard_size}</span> : null}
          {request.style_preference ? <span>Style: {request.style_preference}</span> : null}
          {request.occasion_preference ? <span>Occasion: {request.occasion_preference}</span> : null}
          <span>Delivery: {request.delivery_preference || 'To be discussed'}</span>
          {request.tailor_profile_detail?.city ? <span>Tailor City: {request.tailor_profile_detail.city}</span> : null}
        </div>
      </div>

      {request.reference_product_image || request.inspiration_image ? (
        <div className="tailoring-request-reference">
          {request.reference_product_image ? (
            <div className="tailoring-request-reference-card">
              <img src={request.reference_product_image} alt={request.reference_product_name || 'Reference product'} />
              <div>
                <strong>{request.reference_product_name || 'Selected design reference'}</strong>
                <span>Customer-selected style inspiration</span>
              </div>
            </div>
          ) : null}
          {request.inspiration_image ? (
            <div className="tailoring-request-reference-card">
              <img src={request.inspiration_image} alt="Customer inspiration" />
              <div>
                <strong>Uploaded inspiration</strong>
                <span>Customer reference image</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="tailoring-thread-timeline">
        {timeline.map((message) => (
          <article key={message.id} className={`tailoring-message-card ${message.sender_role === 'tailor' ? 'tailor' : 'customer'}`}>
            <div className="tailoring-message-head">
              <strong>{message.sender_detail?.full_name || message.sender_detail?.email || 'Slessaa User'}</strong>
              <span>{new Date(message.created_at).toLocaleString()}</span>
            </div>
            {message.body ? <p>{message.body}</p> : null}
            {message.design_notes ? <p><strong>Design notes:</strong> {message.design_notes}</p> : null}
            {message.measurement_snapshot && Object.keys(message.measurement_snapshot).length ? (
              <div className="tailoring-message-meta">
                {Object.entries(message.measurement_snapshot).map(([key, value]) => (
                  <span key={key}>{key.replaceAll('_', ' ')}: {value}</span>
                ))}
              </div>
            ) : null}
            {message.fabric_preference || message.color_preference || message.price_estimate || message.delivery_estimate ? (
              <div className="tailoring-message-meta">
                {message.fabric_preference ? <span>Fabric: {message.fabric_preference}</span> : null}
                {message.color_preference ? <span>Color: {message.color_preference}</span> : null}
                {message.price_estimate ? <span>Estimate: NPR {Number(message.price_estimate).toLocaleString()}</span> : null}
                {message.delivery_estimate ? <span>Delivery: {message.delivery_estimate}</span> : null}
              </div>
            ) : null}
            {message.status_snapshot ? <span className="request-status-pill">{message.status_snapshot.replaceAll('_', ' ')}</span> : null}
            {message.attachments?.length ? (
              <div className="tailoring-message-attachments">
                {message.attachments.map((attachment) => (
                  <a key={attachment.id} href={attachment.reference_image} target="_blank" rel="noreferrer">
                    <img src={attachment.reference_image} alt={attachment.caption || 'Reference'} />
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <form className="tailoring-message-form" onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <label className="premium-label">Message</label>
            <textarea
              className="form-control premium-input premium-textarea"
              rows="4"
              value={form.body}
              onChange={(event) => updateField('body', event.target.value)}
              placeholder={isTailor ? 'Reply with suggestions, questions, or confirmation.' : 'Describe your requirement or ask the tailor a question.'}
            ></textarea>
          </div>

          <div className="col-md-6">
            <label className="premium-label">Design Notes</label>
            <textarea className="form-control premium-input" rows="3" value={form.designNotes} onChange={(event) => updateField('designNotes', event.target.value)}></textarea>
          </div>

          <div className="col-md-3">
            <label className="premium-label">Fabric Preference</label>
            <input className="form-control premium-input" value={form.fabricPreference} onChange={(event) => updateField('fabricPreference', event.target.value)} />
          </div>

          <div className="col-md-3">
            <label className="premium-label">Color Preference</label>
            <input className="form-control premium-input" value={form.colorPreference} onChange={(event) => updateField('colorPreference', event.target.value)} />
          </div>

          {!isTailor ? (
            <>
              <div className="col-md-4">
                <label className="premium-label">Chest</label>
                <input className="form-control premium-input" value={form.chest} onChange={(event) => updateField('chest', event.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Waist</label>
                <input className="form-control premium-input" value={form.waist} onChange={(event) => updateField('waist', event.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Height</label>
                <input className="form-control premium-input" value={form.height} onChange={(event) => updateField('height', event.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="col-md-4">
                <label className="premium-label">Price Estimate</label>
                <input className="form-control premium-input" value={form.priceEstimate} onChange={(event) => updateField('priceEstimate', event.target.value)} placeholder="8500" />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Delivery Estimate</label>
                <input className="form-control premium-input" value={form.deliveryEstimate} onChange={(event) => updateField('deliveryEstimate', event.target.value)} placeholder="7 working days" />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Update Status</label>
                <select className="form-select premium-input" value={form.statusSnapshot} onChange={(event) => updateField('statusSnapshot', event.target.value)}>
                  <option value="">No status change</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="col-12">
            <label className="premium-label">Reference Image</label>
            <input className="form-control premium-input" type="file" accept="image/*" onChange={(event) => updateField('attachment', event.target.files?.[0] || null)} />
          </div>
        </div>

        <div className="tailoring-message-actions">
          <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={submitting}>
            {submitting ? 'Sending...' : isTailor ? 'Send Tailor Reply' : 'Send Customer Update'}
          </button>
          {statusMessage ? <span className="tailoring-message-status">{statusMessage}</span> : null}
        </div>
      </form>
    </div>
  );
}

export default TailoringRequestThread;
