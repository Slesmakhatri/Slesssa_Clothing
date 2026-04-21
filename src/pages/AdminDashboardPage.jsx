import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ChatWorkspace from '../components/chat/ChatWorkspace';
import PaginatedCardList from '../components/common/PaginatedCardList';
import PaginatedTable from '../components/common/PaginatedTable';
import AnalyticsBarList from '../components/dashboard/AnalyticsBarList';
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
  listTailorProfiles,
  listTailoringRequests,
  listUsers,
  listVendorApplications,
  listVendors,
  updateProductQuestion,
  updateReturnRequest,
  updateReview,
  updateSupportMessage,
  updateTailoringRequest,
  updateVendorApplication
} from '../services/api';

const SECTION_MAP = {
  admin: 'overview',
  users: 'users',
  vendors: 'vendors',
  products: 'products',
  orders: 'orders',
  'tailoring-requests': 'tailoring-requests',
  returns: 'returns',
  reviews: 'reviews',
  'reviews-questions': 'reviews',
  'contact-messages': 'contact-messages',
  'vendor-support': 'vendor-support',
  'vendor-applications': 'vendor-applications',
  payouts: 'payouts',
  analytics: 'analytics'
};

function getActiveSection(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return SECTION_MAP[parts[parts.length - 1]] || 'overview';
}

function AdminDashboardPage() {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);
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
  const [tailors, setTailors] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [returnDrafts, setReturnDrafts] = useState({});
  const [tailoringDrafts, setTailoringDrafts] = useState({});
  const [savingTailoringRequestId, setSavingTailoringRequestId] = useState(null);

  useEffect(() => {
    getDashboardSummary('admin').then(setSummary).catch(() => undefined);
    listUsers().then(setUsers).catch(() => undefined);
    listVendors().then(setVendors).catch(() => undefined);
    listProducts().then(setProducts).catch(() => undefined);
    listOrders().then(setOrders).catch(() => undefined);
    listReviews({ include_hidden: 1 }).then(setReviews).catch(() => undefined);
    listProductQuestions().then(setQuestions).catch(() => undefined);
    listReturnRequests().then((items) => {
      setReturns(items);
      setReturnDrafts(Object.fromEntries(items.map((item) => [item.id, item.status || 'pending'])));
    }).catch(() => undefined);
    listVendorApplications().then(setVendorApplications).catch(() => undefined);
    listSupportMessages().then(setSupportMessages).catch(() => undefined);
    listTailoringRequests().then(setTailoringRequests).catch(() => undefined);
    listTailorProfiles().then(setTailors).catch(() => undefined);
  }, []);

  const stats = [
    { label: 'Users', value: String(summary?.total_users || users.length).padStart(2, '0'), icon: 'bi-people' },
    { label: 'Revenue', value: `NPR ${Number(summary?.total_revenue || 0).toLocaleString()}`, icon: 'bi-cash-stack' },
    { label: 'Orders', value: String(summary?.total_orders || orders.length).padStart(2, '0'), icon: 'bi-bag' },
    { label: 'Vendors', value: String(summary?.total_vendors || vendors.length).padStart(2, '0'), icon: 'bi-shop' },
    { label: 'Tailors', value: String(summary?.total_tailors || users.filter((item) => item.role === 'tailor').length).padStart(2, '0'), icon: 'bi-scissors' },
    { label: 'Returns', value: String(returns.length).padStart(2, '0'), icon: 'bi-arrow-counterclockwise' }
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

  async function moderateReturn(id) {
    try {
      const updated = await updateReturnRequest(id, { status: returnDrafts[id] || 'under_review' });
      setReturns((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatusMessage(`Return request updated to ${String(updated.status || '').replaceAll('_', ' ')}.`);
    } catch (error) {
      setStatusMessage(error?.payload?.detail || 'Could not update return request.');
    }
  }

  async function updateTailoringAssignment(request) {
    const draft = tailoringDrafts[request.id] || {};
    if (!draft.assigned_tailor && !draft.status) {
      setStatusMessage('Choose a tailor or status first.');
      return;
    }
    setSavingTailoringRequestId(request.id);
    try {
      const payload = {
        assigned_tailor: draft.assigned_tailor ? Number(draft.assigned_tailor) : request.assigned_tailor || null,
        status: draft.status || request.status || (draft.assigned_tailor ? 'assigned' : undefined),
      };
      const updated = await updateTailoringRequest(request.id, payload);
      setTailoringRequests((current) => current.map((item) => (item.id === request.id ? updated : item)));
      setTailoringDrafts((current) => ({
        ...current,
        [request.id]: {
          assigned_tailor: updated.assigned_tailor || '',
          status: updated.status || '',
        }
      }));
      setStatusMessage(`Tailoring request ${request.id} updated.`);
    } catch (error) {
      setStatusMessage(error?.payload?.detail || error?.message || 'Could not update tailoring request.');
    } finally {
      setSavingTailoringRequestId(null);
    }
  }

  const previewOrders = (summary?.recent_orders || orders).slice(0, 5);
  const previewUsers = users.slice(0, 5);
  const previewReturns = returns.slice(0, 5);
  const previewSupportMessages = supportMessages.slice(0, 3);
  const previewTailoringRequests = (summary?.recent_tailoring_requests || tailoringRequests).slice(0, 5);

  function renderPreviewTable({ eyebrow, title, to, columns, items, renderRow, emptyText = 'No records yet.' }) {
    return (
      <div className="table-card">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
          <SectionTitle eyebrow={eyebrow} title={title} align="start" />
          <Link to={to} className="btn btn-sm btn-outline-dark">View All</Link>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {items.length ? items.map(renderRow) : <tr><td colSpan={columns.length}>{emptyText}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderOverview() {
    return (
      <>
        <div className="row g-4 mb-4">
          {stats.map((stat) => (
            <div key={stat.label} className="col-md-4 col-xl-2">
              <DashboardStatCard stat={stat} />
            </div>
          ))}
        </div>

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
            {renderPreviewTable({
              eyebrow: 'Users',
              title: 'Recent accounts',
              to: '/dashboard/admin/users',
              columns: [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' }
              ],
              items: previewUsers,
              renderRow: (user) => (
                <tr key={user.id}>
                  <td>{user.full_name || user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              )
            })}
          </div>
          <div className="col-lg-6">
            {renderPreviewTable({
              eyebrow: 'Orders',
              title: 'Recent platform orders',
              to: '/dashboard/admin/orders',
              columns: [
                { key: 'order', label: 'Order' },
                { key: 'status', label: 'Status' },
                { key: 'payment', label: 'Payment' },
                { key: 'total', label: 'Total' }
              ],
              items: previewOrders,
              renderRow: (order) => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.status}</td>
                  <td>{order.payment_status}</td>
                  <td>NPR {Number(order.total).toLocaleString()}</td>
                </tr>
              )
            })}
          </div>
          <div className="col-lg-6">
            {renderPreviewTable({
              eyebrow: 'Returns',
              title: 'Open return cases',
              to: '/dashboard/admin/returns',
              columns: [
                { key: 'order', label: 'Order' },
                { key: 'product', label: 'Product' },
                { key: 'status', label: 'Status' }
              ],
              items: previewReturns,
              renderRow: (item) => (
                <tr key={item.id}>
                  <td>{item.order_number}</td>
                  <td>{item.product_name}</td>
                  <td>{String(item.status || '').replaceAll('_', ' ')}</td>
                </tr>
              )
            })}
          </div>
          <div className="col-lg-6">
            {renderPreviewTable({
              eyebrow: 'Tailoring Requests',
              title: 'Customization queue',
              to: '/dashboard/admin/tailoring-requests',
              columns: [
                { key: 'request', label: 'Request' },
                { key: 'customer', label: 'Customer' },
                { key: 'status', label: 'Status' }
              ],
              items: previewTailoringRequests,
              renderRow: (request) => (
                <tr key={request.id}>
                  <td>{request.clothing_type}</td>
                  <td>{request.user_detail?.full_name || request.user_detail?.email}</td>
                  <td>{String(request.status || '').replaceAll('_', ' ')}</td>
                </tr>
              )
            })}
          </div>
          <div className="col-12">
            <div className="table-card">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                <SectionTitle eyebrow="Support Inbox" title="Latest support messages" align="start" />
                <Link to="/dashboard/admin/contact-messages" className="btn btn-sm btn-outline-dark">View All</Link>
              </div>
              <PaginatedCardList
                items={previewSupportMessages}
                itemLabel="messages"
                initialPageSize={3}
                pageSizeOptions={[3]}
                emptyState={<div className="filter-empty-state"><h4>No support messages yet</h4><p>Contact messages will appear here.</p></div>}
                renderItem={(item) => <AdminSupportMessageCard key={item.id} item={item} onReview={reviewSupportMessage} />}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderUsersSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Users" title="Registered accounts" align="start" />
        <PaginatedTable
          items={users}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' }
          ]}
          itemLabel="users"
          initialPageSize={10}
          renderRow={(user, _index, key) => (
            <tr key={key}>
              <td>{user.full_name || user.username}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.is_active === false ? 'Suspended' : 'Active'}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderVendorsSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Vendors" title="Approved vendors" align="start" />
        <PaginatedTable
          items={vendors}
          columns={[
            { key: 'brand', label: 'Brand' },
            { key: 'status', label: 'Status' },
            { key: 'email', label: 'Email' },
            { key: 'specialization', label: 'Specialization' }
          ]}
          itemLabel="vendors"
          initialPageSize={10}
          renderRow={(vendor, _index, key) => (
            <tr key={key}>
              <td>{vendor.brand_name}</td>
              <td>{vendor.approval_status}</td>
              <td>{vendor.contact_email}</td>
              <td>{vendor.specialization || 'Not specified'}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderProductsSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Products" title="Catalog management" align="start" />
        <PaginatedTable
          items={products}
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'vendor', label: 'Vendor' },
            { key: 'type', label: 'Type' },
            { key: 'stock', label: 'Stock' },
            { key: 'price', label: 'Price' }
          ]}
          itemLabel="products"
          initialPageSize={10}
          renderRow={(product, _index, key) => (
            <tr key={key}>
              <td>{product.name}</td>
              <td>{product.vendor_name || product.vendor_detail?.brand_name || 'Marketplace'}</td>
              <td>{product.product_type || 'ready_made'}</td>
              <td>{product.stock ?? 0}</td>
              <td>NPR {Number(product.price || 0).toLocaleString()}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderOrdersSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Orders" title="Platform orders" align="start" />
        <PaginatedTable
          items={orders}
          columns={[
            { key: 'order', label: 'Order' },
            { key: 'customer', label: 'Customer' },
            { key: 'status', label: 'Status' },
            { key: 'payment', label: 'Payment' },
            { key: 'total', label: 'Total' }
          ]}
          itemLabel="orders"
          initialPageSize={10}
          renderRow={(order, _index, key) => (
            <tr key={key}>
              <td>{order.order_number}</td>
              <td>{order.full_name || order.email}</td>
              <td>{order.status}</td>
              <td>{order.payment_status || order.payment_method}</td>
              <td>NPR {Number(order.total).toLocaleString()}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderTailoringSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Tailoring Requests" title="Customization requests" align="start" />
        <PaginatedTable
          items={tailoringRequests}
          columns={[
            { key: 'request', label: 'Request' },
            { key: 'customer', label: 'Customer' },
            { key: 'measurements', label: 'Measurements' },
            { key: 'assignment', label: 'Assignment' },
            { key: 'status', label: 'Status' },
            { key: 'vendor', label: 'Vendor' },
            { key: 'actions', label: 'Actions' }
          ]}
          itemLabel="tailoring requests"
          initialPageSize={10}
          renderRow={(request, _index, key) => (
            <tr key={key}>
              <td>
                <strong>{request.reference_product_name || request.clothing_type}</strong>
                <div className="vendor-table-meta">Request #{request.id}</div>
              </td>
              <td>{request.user_detail?.full_name || request.user_detail?.email}</td>
              <td>{request.measurement_detail ? 'Linked' : 'Missing'}</td>
              <td>
                <select
                  className="form-select form-select-sm"
                  value={tailoringDrafts[request.id]?.assigned_tailor ?? request.assigned_tailor ?? ''}
                  onChange={(event) => setTailoringDrafts((current) => ({ ...current, [request.id]: { ...(current[request.id] || {}), assigned_tailor: event.target.value } }))}
                >
                  <option value="">Unassigned</option>
                  {tailors.map((tailor) => (
                    <option key={tailor.id} value={tailor.user}>
                      {tailor.full_name || tailor.user_detail?.full_name || tailor.user_detail?.email}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  className="form-select form-select-sm"
                  value={tailoringDrafts[request.id]?.status ?? request.status ?? 'pending'}
                  onChange={(event) => setTailoringDrafts((current) => ({ ...current, [request.id]: { ...(current[request.id] || {}), status: event.target.value } }))}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="discussion_ongoing">Discussion Ongoing</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="cutting">Cutting</option>
                  <option value="stitching">Stitching</option>
                  <option value="fitting">Fitting</option>
                  <option value="completed">Completed</option>
                </select>
              </td>
              <td>{request.vendor_detail?.brand_name || 'Internal'}</td>
              <td>
                <button type="button" className="btn btn-sm btn-outline-dark" disabled={savingTailoringRequestId === request.id} onClick={() => updateTailoringAssignment(request)}>
                  {savingTailoringRequestId === request.id ? 'Saving...' : 'Save'}
                </button>
              </td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderReturnsSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Returns" title="Return request management" align="start" />
        <PaginatedTable
          items={returns}
          columns={[
            { key: 'order', label: 'Order' },
            { key: 'product', label: 'Product' },
            { key: 'status', label: 'Status' },
            { key: 'decision', label: 'Decision' }
          ]}
          itemLabel="return requests"
          initialPageSize={8}
          renderRow={(item, _index, key) => (
            <tr key={key}>
              <td>{item.order_number}</td>
              <td>{item.product_name}</td>
              <td>{item.status.replaceAll('_', ' ')}</td>
              <td>
                <div className="d-flex flex-column align-items-start gap-2">
                  <select
                    className="form-select form-select-sm"
                    value={returnDrafts[item.id] || item.status}
                    onChange={(event) => setReturnDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved_refund">Approve Refund</option>
                    <option value="approved_exchange">Approve Exchange</option>
                    <option value="approved_voucher">Approve Voucher</option>
                    <option value="more_info_requested">Need More Info</option>
                    <option value="rejected">Reject</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button type="button" className="btn btn-link p-0" onClick={() => moderateReturn(item.id)}>
                    Save
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
    );
  }

  function renderReviewsSection() {
    return (
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-card">
            <SectionTitle eyebrow="Reviews" title="Platform feedback" align="start" />
            <PaginatedTable
              items={reviews}
              columns={[
                { key: 'product', label: 'Product' },
                { key: 'rating', label: 'Rating' },
                { key: 'status', label: 'Status' },
                { key: 'action', label: 'Action' }
              ]}
              itemLabel="reviews"
              initialPageSize={8}
              renderRow={(review, _index, key) => (
                <tr key={key}>
                  <td>{review.product_name}</td>
                  <td>{review.rating}/5</td>
                  <td>{review.status}</td>
                  <td>
                    <button type="button" className="btn btn-link p-0" onClick={() => moderateReview(review.id, review.status === 'hidden' ? 'active' : 'hidden')}>
                      {review.status === 'hidden' ? 'Show' : 'Hide'}
                    </button>
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
        <div className="col-lg-6">
          <div className="table-card">
            <SectionTitle eyebrow="Questions" title="Product Q&A queue" align="start" />
            <PaginatedTable
              items={questions}
              columns={[
                { key: 'product', label: 'Product' },
                { key: 'status', label: 'Status' },
                { key: 'user', label: 'User' },
                { key: 'action', label: 'Action' }
              ]}
              itemLabel="questions"
              initialPageSize={8}
              renderRow={(question, _index, key) => (
                <tr key={key}>
                  <td>{question.product_name}</td>
                  <td>{question.status}</td>
                  <td>{question.user_name}</td>
                  <td>
                    <button type="button" className="btn btn-link p-0" onClick={() => moderateQuestion(question.id, 'moderated')}>
                      Moderate
                    </button>
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderSupportSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Support Inbox" title="Stored contact messages" align="start" />
        <PaginatedCardList
          items={supportMessages}
          itemLabel="support messages"
          initialPageSize={5}
          emptyState={<div className="filter-empty-state"><h4>No support messages yet</h4><p>General support messages will appear here.</p></div>}
          renderItem={(item) => <AdminSupportMessageCard key={item.id} item={item} onReview={reviewSupportMessage} />}
        />
      </div>
    );
  }

  function renderVendorApplicationsSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Vendor Applications" title="Onboarding queue" align="start" />
        <PaginatedCardList
          items={vendorApplications}
          itemLabel="vendor applications"
          initialPageSize={4}
          emptyState={<div className="filter-empty-state"><h4>No vendor applications yet</h4><p>Vendor onboarding requests will appear here.</p></div>}
          renderItem={(item) => <VendorApplicationCard key={item.id} item={item} onReview={reviewVendorApplication} />}
        />
      </div>
    );
  }

  function renderPayoutsSection() {
    return (
      <div className="table-card">
        <SectionTitle eyebrow="Payouts" title="Finance overview" align="start" />
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
        </div>
      </div>
    );
  }

  function renderAnalyticsSection() {
    return (
      <div className="row g-4">
        <div className="col-lg-6">
          <AnalyticsBarList
            title="Payout Status Overview"
            items={Object.entries(summary?.payout_overview || {}).map(([status, count]) => ({ label: status, value: count }))}
            emptyText="Payout visibility will appear after orders are placed."
          />
        </div>
        <div className="col-lg-6">
          <AnalyticsBarList
            title="Top Vendors"
            items={(summary?.top_vendors || []).map((item) => ({ label: item.vendor_name, value: item.sales_count }))}
            emptyText="Vendor performance data will appear here."
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Admin Dashboard</span>
          <h1>Operational management without the endless page</h1>
          <p>Summary first, detailed records in paginated sections, and direct routes for each admin module.</p>
        </div>
      </section>
      <section className="section-space">
        <div className="container">
          {statusMessage ? <div className="alert alert-info mb-4">{statusMessage}</div> : null}
          {activeSection === 'overview' ? renderOverview() : null}
          {activeSection === 'users' ? renderUsersSection() : null}
          {activeSection === 'vendors' ? renderVendorsSection() : null}
          {activeSection === 'products' ? renderProductsSection() : null}
          {activeSection === 'orders' ? renderOrdersSection() : null}
          {activeSection === 'tailoring-requests' ? renderTailoringSection() : null}
          {activeSection === 'returns' ? renderReturnsSection() : null}
          {activeSection === 'reviews' ? renderReviewsSection() : null}
          {activeSection === 'contact-messages' ? renderSupportSection() : null}
          {activeSection === 'vendor-applications' ? renderVendorApplicationsSection() : null}
          {activeSection === 'vendor-support' ? (
            <div className="table-card">
              <ChatWorkspace
                kind="vendor_admin"
                title="Vendor to Admin Support"
                description="Reply to vendor support conversations for payouts, disputes, product approvals, and platform issues."
                emptyTitle="No vendor support threads yet"
                emptyDescription="Vendor-created admin support conversations will appear here."
                allowClose
              />
            </div>
          ) : null}
          {activeSection === 'payouts' ? renderPayoutsSection() : null}
          {activeSection === 'analytics' ? renderAnalyticsSection() : null}
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
      <p className="mb-1"><strong>Applicant:</strong> {item.full_name || item.email}</p>
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
