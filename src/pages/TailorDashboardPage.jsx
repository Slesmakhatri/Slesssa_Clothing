import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AnalyticsBarList from '../components/dashboard/AnalyticsBarList';
import ChatWorkspace from '../components/chat/ChatWorkspace';
import PaginatedCardList from '../components/common/PaginatedCardList';
import PaginatedTable from '../components/common/PaginatedTable';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import SectionTitle from '../components/common/SectionTitle';
import TailoringRequestThread from '../components/tailoring/TailoringRequestThread';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardSummary,
  listChatConversations,
  listTailorMeasurements,
  listTailorProfiles,
  listTailoringRequests,
  updateMeasurement,
  updateTailorProfile,
} from '../services/api';

const SECTION_BY_ROUTE = {
  'assigned-requests': 'requests',
  measurements: 'measurements',
  messages: 'messages',
  'progress-updates': 'progress',
  'completed-work': 'completed',
  earnings: 'earnings',
  settings: 'settings',
};

const MEASUREMENT_FIELDS = ['chest', 'waist', 'hip', 'shoulder', 'sleeve_length', 'inseam', 'neck', 'height'];
const ACTIVE_STATUSES = new Set(['accepted', 'in_progress', 'cutting', 'stitching', 'fitting', 'discussion_ongoing']);

function formatStatus(value) {
  return String(value || 'pending').replaceAll('_', ' ');
}

function requestCustomerName(request) {
  return request.user_detail?.full_name || request.user_detail?.email || 'Customer';
}

function requestTitle(request) {
  return request.reference_product_name || request.clothing_type || 'Custom tailoring request';
}

function TailorDashboardPage() {
  const { user, saveProfile } = useAuth();
  const { section } = useParams();
  const activeSection = SECTION_BY_ROUTE[section] || 'overview';
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [measurementSets, setMeasurementSets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [tailorProfile, setTailorProfile] = useState(null);
  const [measurementDraft, setMeasurementDraft] = useState({});
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    full_name: '',
    phone: '',
    specialization: '',
    years_of_experience: 0,
    short_bio: '',
    location_name: '',
    address: '',
    city: '',
    is_available: true,
  });

  function loadRequests() {
    return listTailoringRequests()
      .then((items) => {
        if (import.meta.env.DEV) {
          console.log('Tailor assigned requests payload', items);
          console.log('Tailor assigned requests count', items.length);
        }
        setRequests(items);
        setActiveRequestId((current) => current || items[0]?.id || null);
      })
      .catch((error) => setStatusMessage(error?.message || 'Could not load assigned tailoring requests.'));
  }

  function loadMeasurementSets() {
    return listTailorMeasurements()
      .then((items) => {
        if (import.meta.env.DEV) {
          console.log('Tailor measurements payload', items);
          console.log('Tailor measurement set count', items.length);
        }
        setMeasurementSets(items);
      })
      .catch((error) => setStatusMessage(error?.message || 'Could not load tailor measurements.'));
  }

  function loadWorkspace() {
    setStatusMessage('');
    Promise.all([
      getDashboardSummary('tailor').then(setSummary),
      listChatConversations({ kind: 'customer_tailor' }).then(setConversations),
      loadRequests(),
      loadMeasurementSets(),
      listTailorProfiles().then((profiles) => {
        const profile = profiles[0] || null;
        setTailorProfile(profile);
        if (profile) {
          setSettingsForm({
            full_name: profile.full_name || user?.full_name || '',
            phone: user?.phone || '',
            specialization: profile.specialization || '',
            years_of_experience: profile.years_of_experience || 0,
            short_bio: profile.short_bio || '',
            location_name: profile.location_name || '',
            address: profile.address || '',
            city: profile.city || '',
            is_available: profile.is_available !== false,
          });
        }
      }),
    ]).catch((error) => setStatusMessage(error?.message || 'Could not load tailor workspace.'));
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const activeRequest = requests.find((item) => item.id === activeRequestId) || requests[0] || null;
  const completedRequests = requests.filter((item) => item.status === 'completed');
  const activeRequests = requests.filter((item) => ACTIVE_STATUSES.has(String(item.status || '').toLowerCase()));
  const requestsWithMeasurements = measurementSets;
  const conversationCount = summary?.conversation_count ?? conversations.length;
  const completionRate = Number(summary?.completion_rate ?? 0);
  const earningsRows = useMemo(
    () => completedRequests.map((request) => {
      const estimate = [...(request.messages || [])]
        .reverse()
        .find((message) => message.price_estimate != null)?.price_estimate;
      return {
        ...request,
        estimated_amount: Number(estimate || 0),
      };
    }),
    [completedRequests]
  );
  const totalEstimatedEarnings = earningsRows.reduce((sum, item) => sum + Number(item.estimated_amount || 0), 0);
  const payableJobs = earningsRows.filter((item) => Number(item.estimated_amount || 0) > 0);

  const stats = [
    { label: 'Assigned', value: String(summary?.assigned_requests ?? requests.length).padStart(2, '0'), icon: 'bi-scissors' },
    { label: 'New Assignments', value: String(summary?.assigned_status_requests ?? requests.filter((item) => item.status === 'assigned').length).padStart(2, '0'), icon: 'bi-person-check' },
    { label: 'Discussion', value: String(conversationCount).padStart(2, '0'), icon: 'bi-chat-dots' },
    { label: 'In Progress', value: String(summary?.in_progress_requests ?? activeRequests.length).padStart(2, '0'), icon: 'bi-rulers' },
    { label: 'Completion Rate', value: `${Number(summary?.completion_rate || 0).toFixed(1)}%`, icon: 'bi-check2-circle' }
  ];

  const performanceItems = useMemo(
    () => [
      { label: 'Active Jobs', value: activeRequests.length },
      { label: 'Finished Jobs', value: completedRequests.length },
      { label: 'Open Threads', value: conversationCount }
    ],
    [activeRequests.length, completedRequests.length, conversationCount]
  );

  function refreshAfterUpdate() {
    loadWorkspace();
  }

  useEffect(() => {
    if (!activeRequest?.measurement_detail) {
      setMeasurementDraft({});
      return;
    }
    setMeasurementDraft({
      chest: activeRequest.measurement_detail.chest || '',
      waist: activeRequest.measurement_detail.waist || '',
      hip: activeRequest.measurement_detail.hip || '',
      shoulder: activeRequest.measurement_detail.shoulder || '',
      sleeve_length: activeRequest.measurement_detail.sleeve_length || '',
      inseam: activeRequest.measurement_detail.inseam || '',
      neck: activeRequest.measurement_detail.neck || '',
      height: activeRequest.measurement_detail.height || '',
      notes: activeRequest.measurement_detail.notes || '',
    });
  }, [activeRequest?.id]);

  async function handleMeasurementSave() {
    if (!activeRequest?.measurement_detail?.id) return;
    setSavingMeasurement(true);
    setStatusMessage('');
    try {
      await updateMeasurement(activeRequest.measurement_detail.id, measurementDraft);
      setStatusMessage('Measurement details updated.');
      await loadWorkspace();
    } catch (error) {
      setStatusMessage(error?.payload?.detail || error?.message || 'Could not update measurement details.');
    } finally {
      setSavingMeasurement(false);
    }
  }

  async function handleSettingsSave(event) {
    event.preventDefault();
    if (!tailorProfile?.id) return;
    setSettingsSaving(true);
    setStatusMessage('');
    try {
      await saveProfile({ full_name: settingsForm.full_name, phone: settingsForm.phone });
      const updated = await updateTailorProfile(tailorProfile.id, {
        full_name: settingsForm.full_name,
        specialization: settingsForm.specialization,
        years_of_experience: Number(settingsForm.years_of_experience || 0),
        short_bio: settingsForm.short_bio,
        location_name: settingsForm.location_name,
        address: settingsForm.address,
        city: settingsForm.city,
        is_available: Boolean(settingsForm.is_available),
      });
      setTailorProfile(updated);
      setStatusMessage('Tailor settings updated.');
      await loadWorkspace();
    } catch (error) {
      setStatusMessage(error?.payload?.detail || error?.message || 'Could not update tailor settings.');
    } finally {
      setSettingsSaving(false);
    }
  }

  function renderOverview() {
    return (
      <div className="tailor-workspace-stack">
        <div className="vendor-metrics-grid">
          {stats.map((stat) => <DashboardStatCard key={stat.label} stat={stat} />)}
        </div>
        {statusMessage ? <div className="alert alert-info">{statusMessage}</div> : null}
        <div className="tailor-dashboard-grid">
          <AnalyticsBarList
            title="Request Status Breakdown"
            items={(summary?.status_breakdown || []).map((item) => ({ label: formatStatus(item.status), value: item.count }))}
            emptyText="Tailoring status data will appear here."
          />
          <div className="analytics-card">
            <h4>Tailor Performance</h4>
            <div className="analytics-metric-grid">
              {performanceItems.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{Number(item.value || 0).toLocaleString()}</strong>
                </div>
              ))}
              <div>
                <span>Completion Rate</span>
                <strong>{Number(summary?.completion_rate || 0).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>
        {renderAssignedRequests()}
      </div>
    );
  }

  function renderAssignedRequests() {
    return (
        <div className="table-card tailor-panel">
          <SectionTitle eyebrow="Assigned Requests" title="Customization orders" text="Only requests assigned to your tailor account are listed here." align="start" />
          <PaginatedTable
            items={requests}
            columns={[
              { key: 'design', label: 'Design' },
              { key: 'customer', label: 'Customer' },
              { key: 'orderType', label: 'Order Type' },
              { key: 'status', label: 'Status' },
              { key: 'measurements', label: 'Measurements' },
              { key: 'action', label: 'Action' }
            ]}
            itemLabel="requests"
            initialPageSize={5}
            tableClassName="tailor-request-table"
            emptyText="No assigned tailoring requests yet."
            renderRow={(request, _index, key) => (
              <tr key={key}>
                <td>
                  <strong>{requestTitle(request)}</strong>
                  <div className="vendor-table-meta">{request.fabric} / {request.color}</div>
                </td>
                <td>{requestCustomerName(request)}</td>
                <td>{request.order_type || 'custom'}</td>
                <td><span className={`status-pill status-${String(request.status || 'pending').toLowerCase()}`}>{formatStatus(request.status)}</span></td>
                <td>{request.measurement_detail ? 'Available' : 'Not added'}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setActiveRequestId(request.id)}>
                    Open Request
                  </button>
                </td>
              </tr>
            )}
          />
      </div>
    );
  }

  function renderMeasurements() {
    return (
      <div className="tailor-workspace-stack">
        <div className="super-admin-page-head">
          <SectionTitle eyebrow="Measurements" title="Customer measurement details" text="Review saved measurements for each assigned customization request." align="start" />
          <span className="status-pill status-info">{requestsWithMeasurements.length} measurement set(s)</span>
        </div>
        <PaginatedCardList
          items={requestsWithMeasurements}
          itemLabel="measurement sets"
          initialPageSize={4}
          className="tailor-measurement-grid"
          emptyState={<div className="filter-empty-state compact">No measurement details are linked to assigned requests yet.</div>}
          renderItem={(entry) => (
            <article key={entry.request_id} className="table-card tailor-measurement-card">
              <div>
                <span className="section-eyebrow">{entry.customer_detail?.full_name || entry.customer_detail?.email || 'Customer'}</span>
                <h4>{entry.reference_product_name || entry.clothing_type || 'Custom tailoring request'}</h4>
                <p>{entry.request_detail?.standard_size ? `Standard size ${entry.request_detail.standard_size}` : 'Custom measurement set'}</p>
              </div>
              <div className="tailor-measurement-values">
                {MEASUREMENT_FIELDS.map((field) => (
                  entry.measurement_detail?.[field] ? (
                    <span key={field}>{field.replaceAll('_', ' ')}: <strong>{entry.measurement_detail[field]}</strong></span>
                  ) : null
                ))}
              </div>
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setActiveRequestId(entry.request_id)}>
                Open Related Request
              </button>
            </article>
          )}
        />
        {activeRequest?.measurement_detail ? (
          <div className="table-card tailor-panel">
            <SectionTitle eyebrow="Edit Measurements" title={requestTitle(activeRequest)} text="Adjust the measurement set linked to this assigned request." align="start" />
            <div className="row g-3">
              {MEASUREMENT_FIELDS.map((field) => (
                <div key={field} className="col-md-3 col-sm-6">
                  <label className="premium-label text-capitalize">{field.replaceAll('_', ' ')}</label>
                  <input
                    className="form-control premium-input"
                    value={measurementDraft[field] ?? ''}
                    onChange={(event) => setMeasurementDraft((current) => ({ ...current, [field]: event.target.value }))}
                  />
                </div>
              ))}
              <div className="col-12">
                <label className="premium-label">Notes</label>
                <textarea
                  className="form-control premium-input"
                  rows="4"
                  value={measurementDraft.notes ?? ''}
                  onChange={(event) => setMeasurementDraft((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>
            <div className="tailoring-message-actions">
              <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={handleMeasurementSave} disabled={savingMeasurement}>
                {savingMeasurement ? 'Saving...' : 'Save Measurements'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderRequestThread(title = 'Request workspace', text = 'Open a request to review details, reply, and save progress updates.') {
    return (
      <div className="tailor-workspace-stack">
        <div className="super-admin-page-head">
          <SectionTitle eyebrow="Tailor Workspace" title={title} text={text} align="start" />
        </div>
        <div className="tailor-request-workbench">
          <div className="table-card tailor-request-picker">
            <SectionTitle eyebrow="Assigned" title="Select request" align="start" />
            <PaginatedCardList
              items={requests}
              itemLabel="requests"
              initialPageSize={5}
              className="dashboard-list-stack"
              emptyState={<div className="filter-empty-state compact">No assigned requests yet.</div>}
              renderItem={(request) => (
                <button
                  key={request.id}
                  type="button"
                  className={`tailor-request-picker__item ${activeRequest?.id === request.id ? 'active' : ''}`}
                  onClick={() => setActiveRequestId(request.id)}
                >
                  <strong>{requestTitle(request)}</strong>
                  <span>{requestCustomerName(request)}</span>
                  <small>{formatStatus(request.status)}</small>
                </button>
              )}
            />
          </div>
          <TailoringRequestThread request={activeRequest} onMessageCreated={refreshAfterUpdate} />
        </div>
      </div>
    );
  }

  function renderMessages() {
    return (
      <ChatWorkspace
        kind="customer_tailor"
        title="Customer - Tailor Messages"
        description="Discuss measurements, design clarification, fitting, and production progress for assigned tailoring requests."
        emptyTitle="No tailoring conversations yet"
        emptyDescription="Assigned tailoring requests create customer conversation threads automatically."
      />
    );
  }

  function renderCompleted() {
    return (
      <div className="tailor-workspace-stack">
        <SectionTitle eyebrow="Completed Work" title="Finished tailoring requests" text="Review completed assignments and customer context." align="start" />
        <PaginatedCardList
          items={completedRequests}
          itemLabel="completed requests"
          initialPageSize={4}
          className="tailor-measurement-grid"
          emptyState={<div className="filter-empty-state compact">Completed work will appear after a request is marked completed.</div>}
          renderItem={(request) => (
            <article key={request.id} className="table-card tailor-measurement-card">
              <span className="section-eyebrow">{requestCustomerName(request)}</span>
              <h4>{requestTitle(request)}</h4>
              <p>{request.design_notes}</p>
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setActiveRequestId(request.id)}>
                Review Details
              </button>
            </article>
          )}
        />
      </div>
    );
  }

  function renderEarnings() {
    return (
      <div className="tailor-workspace-stack">
        <div className="vendor-metrics-grid">
          <DashboardStatCard stat={{ label: 'Completed Jobs', value: String(completedRequests.length).padStart(2, '0'), icon: 'bi-check2-circle' }} />
          <DashboardStatCard stat={{ label: 'Quoted Earnings', value: `NPR ${Number(totalEstimatedEarnings || 0).toLocaleString()}`, icon: 'bi-cash-stack' }} />
          <DashboardStatCard stat={{ label: 'Payable Jobs', value: String(payableJobs.length).padStart(2, '0'), icon: 'bi-wallet2' }} />
          <DashboardStatCard stat={{ label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, icon: 'bi-graph-up-arrow' }} />
        </div>
        <div className="table-card tailor-panel">
          <SectionTitle eyebrow="Earnings" title="Completed work value" text="Estimated from quoted amounts saved in tailoring request updates." align="start" />
          <PaginatedTable
            items={earningsRows}
            columns={[
              { key: 'request', label: 'Request' },
              { key: 'customer', label: 'Customer' },
              { key: 'status', label: 'Status' },
              { key: 'amount', label: 'Estimated Amount' },
            ]}
            itemLabel="earnings rows"
            initialPageSize={5}
            emptyText="No completed tailoring work with price estimates yet."
            renderRow={(request, _index, key) => (
              <tr key={key}>
                <td>{requestTitle(request)}</td>
                <td>{requestCustomerName(request)}</td>
                <td>{formatStatus(request.status)}</td>
                <td>{request.estimated_amount ? `NPR ${Number(request.estimated_amount).toLocaleString()}` : 'Awaiting quote'}</td>
              </tr>
            )}
          />
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="tailor-workspace-stack">
        <div className="table-card tailor-panel">
          <SectionTitle eyebrow="Settings" title="Tailor profile and availability" text="Keep your workspace profile, specialization, and availability up to date." align="start" />
          <form onSubmit={handleSettingsSave}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="premium-label">Full Name</label>
                <input className="form-control premium-input" value={settingsForm.full_name} onChange={(event) => setSettingsForm((current) => ({ ...current, full_name: event.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="premium-label">Phone</label>
                <input className="form-control premium-input" value={settingsForm.phone} onChange={(event) => setSettingsForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="premium-label">Specialization</label>
                <input className="form-control premium-input" value={settingsForm.specialization} onChange={(event) => setSettingsForm((current) => ({ ...current, specialization: event.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="premium-label">Years of Experience</label>
                <input className="form-control premium-input" type="number" min="0" value={settingsForm.years_of_experience} onChange={(event) => setSettingsForm((current) => ({ ...current, years_of_experience: event.target.value }))} />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Studio Name</label>
                <input className="form-control premium-input" value={settingsForm.location_name} onChange={(event) => setSettingsForm((current) => ({ ...current, location_name: event.target.value }))} />
              </div>
              <div className="col-md-4">
                <label className="premium-label">City</label>
                <input className="form-control premium-input" value={settingsForm.city} onChange={(event) => setSettingsForm((current) => ({ ...current, city: event.target.value }))} />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Availability</label>
                <select className="form-select premium-input" value={settingsForm.is_available ? 'yes' : 'no'} onChange={(event) => setSettingsForm((current) => ({ ...current, is_available: event.target.value === 'yes' }))}>
                  <option value="yes">Available</option>
                  <option value="no">Unavailable</option>
                </select>
              </div>
              <div className="col-12">
                <label className="premium-label">Address</label>
                <input className="form-control premium-input" value={settingsForm.address} onChange={(event) => setSettingsForm((current) => ({ ...current, address: event.target.value }))} />
              </div>
              <div className="col-12">
                <label className="premium-label">Short Bio</label>
                <textarea className="form-control premium-input" rows="4" value={settingsForm.short_bio} onChange={(event) => setSettingsForm((current) => ({ ...current, short_bio: event.target.value }))} />
              </div>
            </div>
            <div className="tailoring-message-actions">
              <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={settingsSaving}>
                {settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <section className="role-module-page tailor-dashboard-page">
      {activeSection === 'overview' ? renderOverview() : null}
      {activeSection === 'requests' ? renderRequestThread('Assigned requests', 'Review assigned customization orders, customer details, measurements, and design references.') : null}
      {activeSection === 'measurements' ? renderMeasurements() : null}
      {activeSection === 'messages' ? renderMessages() : null}
      {activeSection === 'progress' ? renderRequestThread('Progress updates', 'Send production notes and move requests through pending, cutting, stitching, fitting, and completed stages.') : null}
      {activeSection === 'completed' ? renderCompleted() : null}
      {activeSection === 'earnings' ? renderEarnings() : null}
      {activeSection === 'settings' ? renderSettings() : null}
    </section>
  );
}

export default TailorDashboardPage;
