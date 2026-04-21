import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AnalyticsBarList from '../components/dashboard/AnalyticsBarList';
import ChatWorkspace from '../components/chat/ChatWorkspace';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import SectionTitle from '../components/common/SectionTitle';
import TailoringRequestThread from '../components/tailoring/TailoringRequestThread';
import { getDashboardSummary, listChatConversations, listTailoringRequests } from '../services/api';

const SECTION_BY_ROUTE = {
  'assigned-requests': 'requests',
  measurements: 'measurements',
  messages: 'messages',
  'progress-updates': 'progress',
  'completed-work': 'completed'
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
  const { section } = useParams();
  const activeSection = SECTION_BY_ROUTE[section] || 'overview';
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  function loadRequests() {
    return listTailoringRequests()
      .then((items) => {
        setRequests(items);
        setActiveRequestId((current) => current || items[0]?.id || null);
      })
      .catch((error) => setStatusMessage(error?.message || 'Could not load assigned tailoring requests.'));
  }

  function loadWorkspace() {
    setStatusMessage('');
    Promise.all([
      getDashboardSummary('tailor').then(setSummary),
      listChatConversations({ kind: 'customer_tailor' }).then(setConversations),
      loadRequests()
    ]).catch((error) => setStatusMessage(error?.message || 'Could not load tailor workspace.'));
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const activeRequest = requests.find((item) => item.id === activeRequestId) || requests[0] || null;
  const completedRequests = requests.filter((item) => item.status === 'completed');
  const activeRequests = requests.filter((item) => ACTIVE_STATUSES.has(String(item.status || '').toLowerCase()));
  const requestsWithMeasurements = requests.filter((item) => item.measurement_detail);
  const conversationCount = summary?.conversation_count ?? conversations.length;

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
        <div className="table-responsive">
          <table className="table align-middle mb-0 tailor-request-table">
            <thead>
              <tr><th>Design</th><th>Customer</th><th>Order Type</th><th>Status</th><th>Measurements</th><th>Action</th></tr>
            </thead>
            <tbody>
              {requests.length ? requests.map((request) => (
                <tr key={request.id}>
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
              )) : (
                <tr><td colSpan="6">No assigned tailoring requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
        <div className="tailor-measurement-grid">
          {requestsWithMeasurements.length ? requestsWithMeasurements.map((request) => (
            <article key={request.id} className="table-card tailor-measurement-card">
              <div>
                <span className="section-eyebrow">{requestCustomerName(request)}</span>
                <h4>{requestTitle(request)}</h4>
                <p>{request.standard_size ? `Standard size ${request.standard_size}` : 'Custom measurement set'}</p>
              </div>
              <div className="tailor-measurement-values">
                {MEASUREMENT_FIELDS.map((field) => (
                  request.measurement_detail?.[field] ? (
                    <span key={field}>{field.replaceAll('_', ' ')}: <strong>{request.measurement_detail[field]}</strong></span>
                  ) : null
                ))}
              </div>
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setActiveRequestId(request.id)}>
                Open Related Request
              </button>
            </article>
          )) : (
            <div className="filter-empty-state compact">No measurement details are linked to assigned requests yet.</div>
          )}
        </div>
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
            <div className="dashboard-list-stack">
              {requests.length ? requests.map((request) => (
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
              )) : (
                <div className="filter-empty-state compact">No assigned requests yet.</div>
              )}
            </div>
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
        <div className="tailor-measurement-grid">
          {completedRequests.length ? completedRequests.map((request) => (
            <article key={request.id} className="table-card tailor-measurement-card">
              <span className="section-eyebrow">{requestCustomerName(request)}</span>
              <h4>{requestTitle(request)}</h4>
              <p>{request.design_notes}</p>
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setActiveRequestId(request.id)}>
                Review Details
              </button>
            </article>
          )) : (
            <div className="filter-empty-state compact">Completed work will appear after a request is marked completed.</div>
          )}
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
    </section>
  );
}

export default TailorDashboardPage;
