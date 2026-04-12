import { useEffect, useState } from 'react';
import AnalyticsBarList from '../components/dashboard/AnalyticsBarList';
import AnalyticsTableCard from '../components/dashboard/AnalyticsTableCard';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import SectionTitle from '../components/common/SectionTitle';
import {
  getDashboardSummary,
  listOrders,
  listProductQuestions,
  listProducts,
  listReturnRequests,
  listReviews,
  listSupportMessages,
  listTailoringRequests,
  listUsers,
  listVendorApplications,
  listVendors,
  updateProductQuestion,
  updateReview,
  updateSupportMessage,
  updateVendorApplication
} from '../services/api';

function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [returns, setReturns] = useState([]);
  const [vendorApplications, setVendorApplications] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [tailoringRequests, setTailoringRequests] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    getDashboardSummary('admin').then(setSummary).catch(() => undefined);
    listUsers().then(setUsers).catch(() => undefined);
    listVendors().then(setVendors).catch(() => undefined);
    listProducts().then(setProducts).catch(() => undefined);
    listOrders().then(setOrders).catch(() => undefined);
    listReviews({ include_hidden: 1 }).then(setReviews).catch(() => undefined);
    listProductQuestions().then(setQuestions).catch(() => undefined);
    listReturnRequests().then(setReturns).catch(() => undefined);
    listVendorApplications().then(setVendorApplications).catch(() => undefined);
    listSupportMessages().then(setSupportMessages).catch(() => undefined);
    listTailoringRequests().then(setTailoringRequests).catch(() => undefined);
  }, []);

  const stats = [
    { label: 'Users', value: String(summary?.total_users || users.length).padStart(2, '0'), icon: 'bi-people' },
    { label: 'Revenue', value: `NPR ${Number(summary?.total_revenue || 0).toLocaleString()}`, icon: 'bi-cash-stack' },
    { label: 'Orders', value: String(summary?.total_orders || orders.length).padStart(2, '0'), icon: 'bi-bag' },
    { label: 'Vendors', value: String(summary?.total_vendors || vendors.length).padStart(2, '0'), icon: 'bi-shop' },
    { label: 'Tailors', value: String(summary?.total_tailors || users.filter((item) => item.role === 'tailor').length).padStart(2, '0'), icon: 'bi-scissors' },
    { label: 'Tailoring', value: String(summary?.total_tailoring_requests || tailoringRequests.length).padStart(2, '0'), icon: 'bi-rulers' },
    { label: 'Applications', value: String(summary?.overview?.pending_vendor_applications || vendorApplications.filter((item) => item.status === 'pending').length).padStart(2, '0'), icon: 'bi-file-earmark-check' }
  ];

  async function reviewVendorApplication(id, status, reviewNote) {
    try {
      const updated = await updateVendorApplication({ id, status, review_note: reviewNote });
      setVendorApplications((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatusMessage(`Vendor application marked as ${status}.`);
    } catch (error) {
      setStatusMessage(error?.payload?.detail || 'Could not update vendor application.');
    }
  }

  async function reviewSupportMessage(id, status, replyNote) {
    try {
      const updated = await updateSupportMessage(id, { status, reply_note: replyNote });
      setSupportMessages((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatusMessage('Support message updated.');
    } catch (error) {
      setStatusMessage(error?.payload?.detail || 'Could not update support message.');
    }
  }

  async function moderateReview(id, nextStatus) {
    try {
      const updated = await updateReview(id, { status: nextStatus });
      setReviews((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatusMessage(`Review marked as ${nextStatus}.`);
    } catch (error) {
      setStatusMessage(error?.payload?.detail || 'Could not update review status.');
    }
  }

  async function moderateQuestion(id, nextStatus) {
    try {
      const updated = await updateProductQuestion(id, { status: nextStatus });
      setQuestions((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatusMessage(`Question marked as ${nextStatus}.`);
    } catch (error) {
      setStatusMessage(error?.payload?.detail || 'Could not update question status.');
    }
  }

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Admin Dashboard</span>
          <h1>Manage users, vendors, products, and orders</h1>
          <p>Operational view for marketplace governance, vendor oversight, and demo analytics.</p>
        </div>
      </section>
      <section className="section-space">
        <div className="container">
          <div className="row g-4 mb-4" id="overview">
            {stats.map((stat) => (
              <div key={stat.label} className="col-md-4 col-xl-2">
                <DashboardStatCard stat={stat} />
              </div>
            ))}
          </div>
          {statusMessage ? <div className="alert alert-info mb-4">{statusMessage}</div> : null}
          <div className="row g-4">
            <div className="col-lg-6">
              <AnalyticsBarList
                title="Order Status Breakdown"
                items={(summary?.order_status_breakdown || []).map((item) => ({ label: item.status, value: item.count }))}
                emptyText="Order status data will appear here."
              />
            </div>
            <div className="col-lg-6">
              <AnalyticsBarList
                title="Top Vendors"
                items={(summary?.top_vendors || []).map((item) => ({ label: item.vendor_name, value: item.sales_count }))}
                emptyText="Vendor sales rankings will appear here."
              />
            </div>
            <div className="col-lg-6">
              <AnalyticsBarList
                title="Payout Status Overview"
                items={Object.entries(summary?.payout_overview || {}).map(([status, count]) => ({ label: status, value: count }))}
                emptyText="Payout visibility will appear after orders are placed."
              />
            </div>
            <div className="col-lg-6" id="payouts">
              <div className="table-card h-100">
                <SectionTitle eyebrow="Platform Finance" title="Commission and payout summary" align="start" />
                <div className="dashboard-metric-grid">
                  <div className="dashboard-metric-card">
                    <strong>NPR {Number(summary?.overview?.platform_commission || 0).toLocaleString()}</strong>
                    <span>Platform commission</span>
                  </div>
                  <div className="dashboard-metric-card">
                    <strong>NPR {Number(summary?.overview?.vendor_payout_amount || 0).toLocaleString()}</strong>
                    <span>Vendor payout total</span>
                  </div>
                  <div className="dashboard-metric-card">
                    <strong>{summary?.overview?.pending_vendor_applications || 0}</strong>
                    <span>Pending applications</span>
                  </div>
                  <div className="dashboard-metric-card">
                    <strong>{summary?.overview?.new_support_messages || 0}</strong>
                    <span>New support messages</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <AnalyticsTableCard
                title="Top Products"
                columns={[
                  { key: 'product_name', label: 'Product', render: (row) => row.product_name },
                  { key: 'quantity_sold', label: 'Units' },
                  { key: 'revenue', label: 'Revenue', type: 'currency' },
                ]}
                rows={summary?.top_products || []}
                emptyText="Product sales rankings will appear here."
              />
            </div>
            <div className="col-lg-6">
              <AnalyticsTableCard
                title="Top Vendors by Revenue"
                columns={[
                  { key: 'vendor_name', label: 'Vendor', render: (row) => row.vendor_name },
                  { key: 'sales_count', label: 'Sales' },
                  { key: 'revenue', label: 'Revenue', type: 'currency' },
                ]}
                rows={summary?.top_vendors || []}
                emptyText="Vendor performance will appear here."
              />
            </div>
            <div className="col-lg-6" id="users">
              <div className="table-card">
                <SectionTitle eyebrow="Users" title="Registered accounts" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th></tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 10).map((user) => (
                      <tr key={user.id}>
                        <td>{user.full_name || user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="table-card">
                <SectionTitle eyebrow="Vendors" title="Approved vendors" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Brand</th><th>Status</th><th>Email</th></tr>
                  </thead>
                  <tbody>
                    {vendors.slice(0, 10).map((vendor) => (
                      <tr key={vendor.id}>
                        <td>{vendor.brand_name}</td>
                        <td>{vendor.approval_status}</td>
                        <td>{vendor.contact_email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12" id="orders">
              <div className="table-card">
                <SectionTitle eyebrow="Orders" title="Recent platform orders" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Order</th><th>Status</th><th>Payment</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {(summary?.recent_orders || orders).slice(0, 12).map((order) => (
                      <tr key={order.id}>
                        <td>{order.order_number}</td>
                        <td>{order.status}</td>
                        <td>{order.payment_status}</td>
                        <td>NPR {Number(order.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12" id="tailoring-requests">
              <div className="table-card">
                <SectionTitle eyebrow="Tailoring Requests" title="Customization requests across the platform" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Request</th><th>Customer</th><th>Assignment</th><th>Status</th><th>Vendor</th></tr>
                  </thead>
                  <tbody>
                    {(summary?.recent_tailoring_requests || tailoringRequests).slice(0, 12).map((request) => (
                      <tr key={request.id}>
                        <td>{request.clothing_type}</td>
                        <td>{request.user_detail?.full_name || request.user_detail?.email}</td>
                        <td>{request.assigned_tailor_detail?.full_name || request.assigned_tailor_detail?.email || 'Unassigned'}</td>
                        <td>{String(request.status || '').replaceAll('_', ' ')}</td>
                        <td>{request.vendor_detail?.brand_name || 'Internal'}</td>
                      </tr>
                    ))}
                    {!(summary?.recent_tailoring_requests || tailoringRequests).length ? (
                      <tr><td colSpan="5">No tailoring requests yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="table-card">
                <SectionTitle eyebrow="Reviews" title="Platform feedback" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Product</th><th>Rating</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {reviews.slice(0, 8).map((review) => (
                      <tr key={review.id}>
                        <td>{review.product_name}</td>
                        <td>{review.rating}/5</td>
                        <td>{review.status}</td>
                        <td>
                          <button type="button" className="btn btn-link p-0" onClick={() => moderateReview(review.id, review.status === 'hidden' ? 'active' : 'hidden')}>
                            {review.status === 'hidden' ? 'Show' : 'Hide'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="table-card">
                <SectionTitle eyebrow="Questions" title="Product Q&A queue" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Product</th><th>Status</th><th>User</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {questions.slice(0, 8).map((question) => (
                      <tr key={question.id}>
                        <td>{question.product_name}</td>
                        <td>{question.status}</td>
                        <td>{question.user_name}</td>
                        <td>
                          <button type="button" className="btn btn-link p-0" onClick={() => moderateQuestion(question.id, 'moderated')}>
                            Moderate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-4" id="returns">
              <div className="table-card">
                <SectionTitle eyebrow="Return Cases" title="Manual review cases" align="start" />
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>Order</th><th>Product</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {returns.slice(0, 8).map((item) => (
                      <tr key={item.id}>
                        <td>{item.order_number}</td>
                        <td>{item.product_name}</td>
                        <td>{item.status.replaceAll('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-lg-6" id="approvals">
              <div className="table-card">
                <SectionTitle eyebrow="Vendor Applications" title="Review public vendor onboarding requests" align="start" />
                <div className="dashboard-list-stack">
                  {vendorApplications.length ? vendorApplications.slice(0, 8).map((item) => (
                    <VendorApplicationCard key={item.id} item={item} onReview={reviewVendorApplication} />
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No vendor applications yet</h4>
                      <p>Public vendor onboarding requests will appear here for admin review.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="table-card">
                <SectionTitle eyebrow="Support Inbox" title="Stored contact messages" align="start" />
                <div className="dashboard-list-stack">
                  {supportMessages.length ? supportMessages.slice(0, 8).map((item) => (
                    <AdminSupportMessageCard key={item.id} item={item} onReview={reviewSupportMessage} />
                  )) : (
                    <div className="filter-empty-state">
                      <h4>No support messages yet</h4>
                      <p>General support contact messages and routed vendor messages will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function VendorApplicationCard({ item, onReview }) {
  const [reviewNote, setReviewNote] = useState(item.review_note || '');

  useEffect(() => {
    setReviewNote(item.review_note || '');
  }, [item.id, item.review_note]);

  return (
    <article className="dashboard-list-card">
      <div className="dashboard-list-head">
        <strong>{item.business_name}</strong>
        <span>{item.status}</span>
      </div>
      <p className="mb-1"><strong>Applicant:</strong> {item.full_name} · {item.email}</p>
      <p className="mb-1"><strong>Specialization:</strong> {item.specialization || 'Not specified'}</p>
      <p>{item.business_description || 'No business description provided.'}</p>
      <textarea
        className="form-control premium-input premium-textarea mb-3"
        rows="3"
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Add an admin review note."
      />
      <div className="chip-row">
        <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={() => onReview(item.id, 'approved', reviewNote || 'Approved by admin.')}>
          Approve
        </button>
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onReview(item.id, 'rejected', reviewNote || 'Rejected by admin.')}>
          Reject
        </button>
      </div>
    </article>
  );
}

function AdminSupportMessageCard({ item, onReview }) {
  const [replyNote, setReplyNote] = useState(item.reply_note || '');

  useEffect(() => {
    setReplyNote(item.reply_note || '');
  }, [item.id, item.reply_note]);

  return (
    <article className="dashboard-list-card">
      <div className="dashboard-list-head">
        <strong>{item.subject}</strong>
        <span>{item.status}</span>
      </div>
      <p className="mb-1"><strong>From:</strong> {item.name} · {item.email}</p>
      <p className="mb-1"><strong>Target:</strong> {item.target_type}</p>
      <p>{item.message}</p>
      <textarea
        className="form-control premium-input premium-textarea mb-3"
        rows="3"
        value={replyNote}
        onChange={(event) => setReplyNote(event.target.value)}
        placeholder="Add a reply or internal admin note."
      />
      <div className="chip-row">
        <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={() => onReview(item.id, 'replied', replyNote || 'Admin replied to this message.')}>
          Save Reply
        </button>
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onReview(item.id, 'read', replyNote)}>
          Mark Read
        </button>
        <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => onReview(item.id, 'closed', replyNote)}>
          Close
        </button>
      </div>
    </article>
  );
}

export default AdminDashboardPage;
