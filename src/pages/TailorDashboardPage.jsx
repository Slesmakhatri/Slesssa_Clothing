import { useEffect, useState } from 'react';
import AnalyticsBarList from '../components/dashboard/AnalyticsBarList';
import ChatWorkspace from '../components/chat/ChatWorkspace';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import SectionTitle from '../components/common/SectionTitle';
import TailoringRequestThread from '../components/tailoring/TailoringRequestThread';
import { getDashboardSummary, listTailoringRequests } from '../services/api';

function TailorDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);

  function loadRequests() {
    listTailoringRequests()
      .then((items) => {
        setRequests(items);
        setActiveRequestId((current) => current || items[0]?.id || null);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    getDashboardSummary('tailor').then(setSummary).catch(() => undefined);
    loadRequests();
  }, []);

  const activeRequest = requests.find((item) => item.id === activeRequestId) || null;
  const stats = [
    { label: 'Assigned', value: String(summary?.assigned_requests || requests.length).padStart(2, '0'), icon: 'bi-scissors' },
    { label: 'New Assignments', value: String(summary?.assigned_status_requests || requests.filter((item) => item.status === 'assigned').length).padStart(2, '0'), icon: 'bi-person-check' },
    { label: 'Discussion', value: String(summary?.discussion_requests || 0).padStart(2, '0'), icon: 'bi-chat-dots' },
    { label: 'In Progress', value: String(summary?.in_progress_requests || 0).padStart(2, '0'), icon: 'bi-rulers' },
    { label: 'Completion Rate', value: `${Number(summary?.completion_rate || 0).toFixed(1)}%`, icon: 'bi-check2-circle' }
  ];

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Tailor Dashboard</span>
          <h1>Inbox, tailoring requests, and structured customer communication</h1>
          <p>Reply with questions, suggestions, estimates, and status updates inside each custom order thread.</p>
        </div>
      </section>
      <section className="section-space">
        <div className="container">
          <div className="row g-4 mb-4" id="overview">
            {stats.map((stat) => (
              <div key={stat.label} className="col-md-4 col-xl">
                <DashboardStatCard stat={stat} />
              </div>
            ))}
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <AnalyticsBarList
                title="Request Status Breakdown"
                items={(summary?.status_breakdown || []).map((item) => ({ label: item.status, value: item.count }))}
                emptyText="Tailoring status data will appear here."
              />
            </div>
            <div className="col-lg-6">
              <div className="analytics-card">
                <h4>Tailor Performance</h4>
                <div className="analytics-metric-grid">
                  <div>
                    <span>Total Requests</span>
                    <strong>{Number(summary?.assigned_requests || requests.length).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{Number(summary?.completed_requests || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Completion Rate</span>
                    <strong>{Number(summary?.completion_rate || 0).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-thread-layout" id="requests">
            <div className="table-card">
              <SectionTitle eyebrow="Tailor Inbox" title="Assigned request panel" align="start" />
              <table className="table align-middle mb-0">
                <thead>
                  <tr><th>Garment</th><th>Status</th><th>Customer</th><th>Open</th></tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.clothing_type}</td>
                      <td>{request.status}</td>
                      <td>{request.user_detail?.full_name || request.user_detail?.email}</td>
                      <td>
                        <button type="button" className="btn btn-link p-0" onClick={() => setActiveRequestId(request.id)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TailoringRequestThread request={activeRequest} onMessageCreated={loadRequests} />
          </div>

          <div className="mt-4" id="chat">
            <ChatWorkspace
              kind="customer_tailor"
              title="Customer ↔ Tailor Messages"
              description="Discuss measurements, design preferences, reference images, fitting, and progress updates in a dedicated chat thread."
              emptyTitle="No tailoring conversations yet"
              emptyDescription="Conversations linked to assigned tailoring requests will appear here."
            />
          </div>
        </div>
      </section>
    </>
  );
}

export default TailorDashboardPage;
