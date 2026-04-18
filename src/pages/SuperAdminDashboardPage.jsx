import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import SectionTitle from '../components/common/SectionTitle';
import {
  createAdminUser,
  deleteAdminUser,
  getDashboardSummary,
  getPlatformSettings,
  getSuperAdminAnalytics,
  listUsers,
  listTailorProfiles,
  listVendorApplications,
  listVendors,
  listOrders,
  updateAdminUser,
  updateOrderStatus,
  updatePlatformSettings,
  updateTailorProfileStatus,
  updateVendorApplication,
  updateVendorStatus
} from '../services/api';

const DEFAULT_ADMIN_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'admin',
  is_active: true
};

const DEFAULT_SETTINGS_FORM = {
  customized: 0.15,
  ready_made: 0.10,
  return_policy: '',
  support_email: '',
  maintenance_mode: false
};

const USER_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'vendor', label: 'Vendors' },
  { key: 'tailor', label: 'Tailors' },
  { key: 'admin', label: 'Admins' }
];

const ORDER_STATUS_ACTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'In progress' },
  { value: 'completed', label: 'Completed' }
];

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRole(value) {
  return String(value || 'customer').replaceAll('_', ' ');
}

function formatOrderStatus(value) {
  const status = String(value || 'pending').toLowerCase();
  if (status === 'processing' || status === 'ready') return 'In progress';
  return status.replaceAll('_', ' ');
}

function maxSeriesValue(items, keys) {
  return Math.max(1, ...items.flatMap((item) => keys.map((key) => Number(item[key] || 0))));
}

function EmptyChart({ text = 'No analytics data available yet.' }) {
  return <div className="super-admin-chart-empty">{text}</div>;
}

function LineChart({ items = [], valueKey, labelPrefix = '' }) {
  if (!items.length) return <EmptyChart />;
  const width = 640;
  const height = 220;
  const maxValue = maxSeriesValue(items, [valueKey]);
  const points = items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : (index / (items.length - 1)) * width;
    const y = height - (Number(item[valueKey] || 0) / maxValue) * (height - 26) - 10;
    return { x, y, item };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return (
    <div className="super-admin-chart-scroll">
      <svg className="super-admin-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
        <path d={path} />
        {points.map((point) => (
          <g key={point.item.period}>
            <circle cx={point.x} cy={point.y} r="5" />
            <text x={point.x} y={height - 2} textAnchor="middle">{point.item.period}</text>
            <text x={point.x} y={Math.max(point.y - 10, 14)} textAnchor="middle">{labelPrefix}{Number(point.item[valueKey] || 0).toLocaleString()}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function GroupedBarChart({ items = [], keys = [], labels = {} }) {
  if (!items.length) return <EmptyChart />;
  const maxValue = maxSeriesValue(items, keys);
  return (
    <div className="super-admin-bar-chart">
      {items.map((item) => (
        <div key={item.period || item.label} className="super-admin-bar-group">
          <span>{item.period || item.label}</span>
          <div className="super-admin-bar-stack">
            {keys.map((key) => (
              <div key={key} className={`super-admin-bar super-admin-bar--${key}`} style={{ height: `${Math.max((Number(item[key] || 0) / maxValue) * 100, item[key] ? 6 : 0)}%` }}>
                <small>{Number(item[key] || 0).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="super-admin-chart-legend">
        {keys.map((key) => <span key={key}><i className={`super-admin-legend-dot super-admin-bar--${key}`}></i>{labels[key] || key.replaceAll('_', ' ')}</span>)}
      </div>
    </div>
  );
}

function DonutChart({ items = [] }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return <EmptyChart />;
  let offset = 25;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const segments = items.map((item, index) => {
    const value = Number(item.value || 0);
    const dash = (value / total) * circumference;
    const segment = { ...item, dash, offset, className: `segment-${index % 5}` };
    offset -= dash;
    return segment;
  });
  return (
    <div className="super-admin-donut-wrap">
      <svg className="super-admin-donut" viewBox="0 0 120 120" role="img" aria-label="Distribution chart">
        <circle cx="60" cy="60" r={radius} className="donut-bg" />
        {segments.map((segment) => (
          <circle key={segment.label} cx="60" cy="60" r={radius} className={segment.className} strokeDasharray={`${segment.dash} ${circumference - segment.dash}`} strokeDashoffset={segment.offset} />
        ))}
        <text x="60" y="58" textAnchor="middle">{total}</text>
        <text x="60" y="73" textAnchor="middle">total</text>
      </svg>
      <div className="super-admin-donut-legend">
        {items.map((item, index) => (
          <span key={item.label}><i className={`segment-${index % 5}`}></i>{item.label}: {Number(item.value || 0).toLocaleString()}</span>
        ))}
      </div>
    </div>
  );
}

function SuperAdminDashboardPage() {
  const { section } = useParams();
  const activeSection = section || 'dashboard';
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorApplications, setVendorApplications] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(DEFAULT_ADMIN_FORM);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS_FORM);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [vendorReviewNotes, setVendorReviewNotes] = useState({});
  const [savingVendorAction, setSavingVendorAction] = useState('');
  const [savingTailorAction, setSavingTailorAction] = useState('');
  const [savingOrderAction, setSavingOrderAction] = useState('');

  async function loadWorkspace({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const [summaryPayload, userList, platformSettings, vendorList, vendorApplicationList, tailorList, orderList] = await Promise.all([
        getDashboardSummary('super-admin'),
        listUsers(),
        getPlatformSettings(),
        listVendors(),
        listVendorApplications(),
        listTailorProfiles(),
        listOrders()
      ]);
      setSummary(summaryPayload);
      setUsers(userList);
      setVendors(vendorList);
      setVendorApplications(vendorApplicationList);
      setTailors(tailorList);
      setOrders(orderList);
      setSelectedUserId((current) => current || userList[0]?.id || null);
      setSettingsForm({
        customized: platformSettings?.commission_rates?.customized ?? DEFAULT_SETTINGS_FORM.customized,
        ready_made: platformSettings?.commission_rates?.ready_made ?? DEFAULT_SETTINGS_FORM.ready_made,
        return_policy: platformSettings?.return_policy || '',
        support_email: platformSettings?.platform_config?.support_email || '',
        maintenance_mode: Boolean(platformSettings?.platform_config?.maintenance_mode)
      });
    } catch (error) {
      setStatus(error?.message || 'Could not load super admin workspace.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (activeSection !== 'analytics' || analytics) return;
    setAnalyticsLoading(true);
    setAnalyticsError('');
    getSuperAdminAnalytics()
      .then(setAnalytics)
      .catch((error) => setAnalyticsError(error?.message || 'Could not load analytics.'))
      .finally(() => setAnalyticsLoading(false));
  }, [activeSection, analytics]);

  const adminUsers = users.filter((user) => ['admin', 'super_admin'].includes(user.role));
  const pendingVendorApplications = vendorApplications.filter((application) => application.status === 'pending');
  const pendingVendors = vendors.filter((vendor) => vendor.approval_status === 'pending');
  const pendingTailors = tailors.filter((tailor) => (tailor.approval_status || 'pending') === 'pending');
  const stats = [
    { label: 'Users', value: String(summary?.total_users || users.length).padStart(2, '0'), icon: 'bi-people' },
    { label: 'Admins', value: String(summary?.total_admins || adminUsers.filter((user) => user.role === 'admin').length).padStart(2, '0'), icon: 'bi-person-gear' },
    { label: 'Vendors', value: String(summary?.total_vendors || vendors.length).padStart(2, '0'), icon: 'bi-shop' },
    { label: 'Tailors', value: String(summary?.total_tailors || tailors.length).padStart(2, '0'), icon: 'bi-scissors' },
    { label: 'Orders', value: String(summary?.total_orders || orders.length).padStart(2, '0'), icon: 'bi-bag-check' },
    { label: 'Commission', value: `NPR ${Number(summary?.platform_commission || 0).toLocaleString()}`, icon: 'bi-cash-stack' }
  ];

  const filteredUsers = useMemo(() => {
    if (userFilter === 'all') return users;
    if (userFilter === 'admin') return users.filter((user) => ['admin', 'super_admin'].includes(user.role));
    return users.filter((user) => user.role === userFilter);
  }, [userFilter, users]);
  const selectedUser = users.find((user) => user.id === selectedUserId) || filteredUsers[0] || null;

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'admin',
      is_active: user.is_active !== false
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    try {
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password;
      if (editingId) {
        await updateAdminUser(editingId, payload);
        setStatus('Admin user updated.');
      } else {
        await createAdminUser(payload);
        setStatus('Admin user created.');
      }
      setForm(DEFAULT_ADMIN_FORM);
      setEditingId(null);
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || 'Could not save admin user.');
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove ${user.full_name || user.email}?`)) return;
    try {
      await deleteAdminUser(user.id);
      setStatus('Admin user removed.');
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || 'Could not remove admin user.');
    }
  }

  async function handleSettingsSubmit(event) {
    event.preventDefault();
    setStatus('');
    try {
      await updatePlatformSettings({
        commission_rates: {
          customized: Number(settingsForm.customized),
          ready_made: Number(settingsForm.ready_made)
        },
        return_policy: settingsForm.return_policy,
        platform_config: {
          support_email: settingsForm.support_email,
          maintenance_mode: settingsForm.maintenance_mode
        }
      });
      setStatus('Platform settings updated.');
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || 'Could not update platform settings.');
    }
  }

  async function handleVendorApplicationDecision(application, nextStatus) {
    const reviewNote = vendorReviewNotes[application.id] || (nextStatus === 'approved' ? 'Approved by super admin.' : 'Rejected by super admin.');
    setStatus('');
    setSavingVendorAction(`application-${application.id}-${nextStatus}`);
    try {
      await updateVendorApplication({
        id: application.id,
        status: nextStatus,
        review_note: reviewNote
      });
      setStatus(`Vendor application ${nextStatus}.`);
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || `Could not ${nextStatus} vendor application.`);
    } finally {
      setSavingVendorAction('');
    }
  }

  async function handleVendorStatusDecision(vendor, nextStatus) {
    if (!vendor?.slug) return;
    setStatus('');
    setSavingVendorAction(`vendor-${vendor.slug}-${nextStatus}`);
    try {
      await updateVendorStatus(vendor.slug, nextStatus);
      setStatus(`${vendor.brand_name || 'Vendor'} marked as ${nextStatus}.`);
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || `Could not ${nextStatus} vendor.`);
    } finally {
      setSavingVendorAction('');
    }
  }

  async function handleTailorStatusDecision(tailor, nextStatus) {
    if (!tailor?.id) return;
    setStatus('');
    setSavingTailorAction(`tailor-${tailor.id}-${nextStatus}`);
    try {
      await updateTailorProfileStatus(tailor.id, nextStatus);
      setStatus(`${tailor.full_name || tailor.user_detail?.full_name || 'Tailor'} marked as ${nextStatus}.`);
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || `Could not ${nextStatus} tailor.`);
    } finally {
      setSavingTailorAction('');
    }
  }

  async function handleOrderStatusDecision(order, nextStatus) {
    if (!order?.id) return;
    setStatus('');
    setSavingOrderAction(`order-${order.id}-${nextStatus}`);
    try {
      await updateOrderStatus(order.id, {
        status: nextStatus,
        note: `Marked ${formatOrderStatus(nextStatus)} by super admin.`
      });
      setStatus(`${order.order_number || 'Order'} marked ${formatOrderStatus(nextStatus)}.`);
      await loadWorkspace({ silent: true });
    } catch (error) {
      setStatus(error?.message || 'Could not update order status.');
    } finally {
      setSavingOrderAction('');
    }
  }

  function renderStats() {
    return (
      <div className="vendor-metrics-grid">
        {stats.map((stat) => (
          <DashboardStatCard key={stat.label} stat={stat} />
        ))}
      </div>
    );
  }

  function renderUsersPage() {
    return (
      <>
        <div className="super-admin-page-head">
          <SectionTitle eyebrow="Users" title="All platform users" text="Review customers, vendors, tailors, admins, and super admins from one protected workspace." align="start" />
          <div className="super-admin-filter-tabs">
            {USER_FILTERS.map((filter) => (
              <button key={filter.key} type="button" className={userFilter === filter.key ? 'active' : ''} onClick={() => setUserFilter(filter.key)}>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row g-4">
          <div className="col-xl-8">
            <div className="table-card">
              <div className="table-responsive">
                <table className="table align-middle mb-0 super-admin-users-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.length ? filteredUsers.map((user) => (
                      <tr key={user.id} className={selectedUser?.id === user.id ? 'active' : ''} onClick={() => setSelectedUserId(user.id)}>
                        <td>{user.full_name || user.username || 'Unnamed user'}</td>
                        <td>{user.email}</td>
                        <td><span className="request-status-pill">{formatRole(user.role)}</span></td>
                        <td>{user.is_active === false ? 'Suspended' : 'Active'}</td>
                        <td>{formatDate(user.date_joined)}</td>
                        <td>
                          <div className="vendor-table-actions" onClick={(event) => event.stopPropagation()}>
                            {['admin', 'super_admin'].includes(user.role) ? (
                              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => startEdit(user)}>Edit</button>
                            ) : (
                              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setSelectedUserId(user.id)}>Details</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6">No users found for this filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="table-card super-admin-user-detail">
              <SectionTitle eyebrow="User Detail" title={selectedUser ? (selectedUser.full_name || selectedUser.email) : 'Select a user'} align="start" />
              {selectedUser ? (
                <div className="dashboard-list-stack">
                  <article className="dashboard-list-card"><strong>Email</strong><p>{selectedUser.email}</p></article>
                  <article className="dashboard-list-card"><strong>Role</strong><p>{formatRole(selectedUser.role)}</p></article>
                  <article className="dashboard-list-card"><strong>Status</strong><p>{selectedUser.is_active === false ? 'Suspended' : 'Active'}</p></article>
                  <article className="dashboard-list-card"><strong>Joined</strong><p>{formatDate(selectedUser.date_joined)}</p></article>
                  <article className="dashboard-list-card"><strong>Phone</strong><p>{selectedUser.phone || 'Not provided'}</p></article>
                </div>
              ) : (
                <div className="filter-empty-state"><h4>No user selected</h4><p>Choose a row to inspect account details.</p></div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderAdminManagementPage() {
    return (
      <div className="row g-4">
        <div className="col-xl-5">
          <div className="table-card">
            <SectionTitle eyebrow="Admin Management" title={editingId ? 'Edit admin user' : 'Create admin user'} align="start" />
            <form className="vendor-form-grid" onSubmit={handleSubmit}>
              <label className="vendor-form-grid__full">Full Name<input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required /></label>
              <label className="vendor-form-grid__full">Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
              <label>Phone<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Role<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label>
              <label className="vendor-form-grid__full">Password {editingId ? '(leave blank to keep current)' : ''}<input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required={!editingId} /></label>
              <label className="vendor-checkbox-field vendor-form-grid__full"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />Active account</label>
              <div className="vendor-form-actions vendor-form-grid__full">
                <button type="submit" className="btn btn-dark">{editingId ? 'Update Admin' : 'Create Admin'}</button>
                {editingId ? <button type="button" className="btn btn-outline-dark" onClick={() => { setEditingId(null); setForm(DEFAULT_ADMIN_FORM); }}>Cancel</button> : null}
              </div>
            </form>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="table-card">
            <SectionTitle eyebrow="Admin Management" title="Admin and super admin accounts" align="start" />
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name || user.username}</td>
                      <td>{user.email}</td>
                      <td>{formatRole(user.role)}</td>
                      <td>{user.is_active === false ? 'Suspended' : 'Active'}</td>
                      <td>
                        <div className="vendor-table-actions">
                          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => startEdit(user)}>Edit</button>
                          {user.role !== 'super_admin' ? <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(user)}>Delete</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderVendorsPage() {
    return (
      <div className="super-admin-vendors-page">
        <div className="super-admin-page-head">
          <SectionTitle
            eyebrow="Vendors"
            title="Vendor approval center"
            text="Review vendor applications, approve or reject onboarding, and manage active vendor profile access."
            align="start"
          />
          <div className="super-admin-vendor-summary">
            <span>{pendingVendorApplications.length} pending applications</span>
            <span>{pendingVendors.length} pending profiles</span>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12">
            <div className="table-card super-admin-vendor-panel">
              <SectionTitle eyebrow="Applications" title="Vendor applications" text="Approve applications so vendors can complete signup and start selling." align="start" />
              <div className="table-responsive">
                <table className="table align-middle mb-0 super-admin-vendor-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Applicant</th>
                      <th>Specialization</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Review Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorApplications.length ? vendorApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <strong>{application.business_name}</strong>
                          <div className="vendor-table-meta">{application.business_description || 'No description provided.'}</div>
                        </td>
                        <td>
                          <strong>{application.full_name}</strong>
                          <div className="vendor-table-meta">{application.email}</div>
                          <div className="vendor-table-meta">{application.phone}</div>
                        </td>
                        <td>{application.specialization || 'Not provided'}</td>
                        <td>{application.location || 'Not provided'}</td>
                        <td><span className={`status-pill status-${application.status}`}>{application.status}</span></td>
                        <td>
                          <textarea
                            rows="2"
                            className="super-admin-review-note"
                            placeholder="Optional note"
                            value={vendorReviewNotes[application.id] ?? application.review_note ?? ''}
                            onChange={(event) => setVendorReviewNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                          />
                        </td>
                        <td>
                          <div className="vendor-table-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-dark"
                              disabled={savingVendorAction === `application-${application.id}-approved` || application.status === 'approved'}
                              onClick={() => handleVendorApplicationDecision(application, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={savingVendorAction === `application-${application.id}-rejected` || application.status === 'rejected'}
                              onClick={() => handleVendorApplicationDecision(application, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7">No vendor applications yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="table-card super-admin-vendor-panel">
              <SectionTitle eyebrow="Profiles" title="Vendor list" text="Manage vendor profiles that already exist in the system." align="start" />
              <div className="table-responsive">
                <table className="table align-middle mb-0 super-admin-vendor-table">
                  <thead>
                    <tr>
                      <th>Shop</th>
                      <th>Owner</th>
                      <th>Contact</th>
                      <th>Specialization</th>
                      <th>Setup</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.length ? vendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>
                          <strong>{vendor.brand_name || 'Unnamed shop'}</strong>
                          <div className="vendor-table-meta">{vendor.location || vendor.address || 'No location added'}</div>
                        </td>
                        <td>
                          <strong>{vendor.user_detail?.full_name || vendor.user_detail?.username || 'Vendor'}</strong>
                          <div className="vendor-table-meta">{vendor.user_detail?.email || 'No account email'}</div>
                        </td>
                        <td>
                          <div>{vendor.contact_email || 'No email'}</div>
                          <div className="vendor-table-meta">{vendor.contact_phone || 'No phone'}</div>
                        </td>
                        <td>{vendor.specialization || 'Not provided'}</td>
                        <td>{vendor.is_shop_setup_complete ? 'Complete' : 'Incomplete'}</td>
                        <td><span className={`status-pill status-${vendor.approval_status}`}>{vendor.approval_status}</span></td>
                        <td>
                          <div className="vendor-table-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-dark"
                              disabled={savingVendorAction === `vendor-${vendor.slug}-approved` || vendor.approval_status === 'approved'}
                              onClick={() => handleVendorStatusDecision(vendor, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={savingVendorAction === `vendor-${vendor.slug}-rejected` || vendor.approval_status === 'rejected'}
                              onClick={() => handleVendorStatusDecision(vendor, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7">No vendor profiles found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTailorsPage() {
    return (
      <div className="super-admin-tailors-page">
        <div className="super-admin-page-head">
          <SectionTitle
            eyebrow="Tailors"
            title="Tailor management"
            text="Review tailor profiles, approve or reject access, and monitor availability for custom stitching work."
            align="start"
          />
          <div className="super-admin-vendor-summary">
            <span>{tailors.length} total tailors</span>
            <span>{pendingTailors.length} pending approval</span>
          </div>
        </div>

        <div className="table-card super-admin-tailor-panel">
          <SectionTitle eyebrow="Approval" title="Tailor list" text="Only approved and available tailors are shown to customers for recommendations." align="start" />
          <div className="table-responsive">
            <table className="table align-middle mb-0 super-admin-tailor-table">
              <thead>
                <tr>
                  <th>Tailor</th>
                  <th>Contact</th>
                  <th>Specialization</th>
                  <th>Experience</th>
                  <th>Location</th>
                  <th>Availability</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tailors.length ? tailors.map((tailor) => {
                  const approvalStatus = tailor.approval_status || 'pending';
                  const displayName = tailor.full_name || tailor.user_detail?.full_name || 'Unnamed tailor';
                  return (
                    <tr key={tailor.id}>
                      <td>
                        <strong>{displayName}</strong>
                        <div className="vendor-table-meta">{tailor.short_bio || 'No profile bio added.'}</div>
                      </td>
                      <td>
                        <div>{tailor.user_detail?.email || 'No email'}</div>
                        <div className="vendor-table-meta">{tailor.user_detail?.phone || 'No phone'}</div>
                      </td>
                      <td>
                        <strong>{tailor.specialization || 'Custom tailoring'}</strong>
                        <div className="vendor-table-meta">{(tailor.supported_clothing_types || []).join(', ') || 'Clothing types not listed'}</div>
                      </td>
                      <td>{Number(tailor.years_of_experience || 0)} years</td>
                      <td>
                        <div>{tailor.city || tailor.location_name || 'Not provided'}</div>
                        <div className="vendor-table-meta">{tailor.address || 'No address'}</div>
                      </td>
                      <td>{tailor.is_available ? 'Available' : 'Unavailable'}</td>
                      <td><span className={`status-pill status-${approvalStatus}`}>{approvalStatus}</span></td>
                      <td>
                        <div className="vendor-table-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            disabled={savingTailorAction === `tailor-${tailor.id}-approved` || approvalStatus === 'approved'}
                            onClick={() => handleTailorStatusDecision(tailor, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={savingTailorAction === `tailor-${tailor.id}-rejected` || approvalStatus === 'rejected'}
                            onClick={() => handleTailorStatusDecision(tailor, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="8">No tailor profiles found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderOrdersPage() {
    const pendingCount = orders.filter((order) => String(order.status || '').toLowerCase() === 'pending').length;
    const progressCount = orders.filter((order) => ['processing', 'ready'].includes(String(order.status || '').toLowerCase())).length;
    const completedCount = orders.filter((order) => ['completed', 'delivered'].includes(String(order.status || '').toLowerCase())).length;

    return (
      <div className="super-admin-orders-page">
        <div className="super-admin-page-head">
          <SectionTitle
            eyebrow="Orders"
            title="Order management"
            text="Track customer orders and move fulfillment between pending, in progress, and completed."
            align="start"
          />
          <div className="super-admin-vendor-summary">
            <span>{pendingCount} pending</span>
            <span>{progressCount} in progress</span>
            <span>{completedCount} completed</span>
          </div>
        </div>

        <div className="table-card super-admin-order-panel">
          <SectionTitle eyebrow="Order List" title="All orders" text="Update order status from the Super Admin workspace." align="start" />
          <div className="table-responsive">
            <table className="table align-middle mb-0 super-admin-order-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length ? orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number || `Order #${order.id}`}</strong>
                      <div className="vendor-table-meta">{formatDate(order.created_at)}</div>
                    </td>
                    <td>
                      <strong>{order.full_name || 'Customer'}</strong>
                      <div className="vendor-table-meta">{order.email}</div>
                      <div className="vendor-table-meta">{order.phone}</div>
                    </td>
                    <td>
                      <strong>{(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'}</strong>
                      <div className="vendor-table-meta">
                        {(order.items || []).slice(0, 2).map((item) => item.product_name).filter(Boolean).join(', ') || 'No item details'}
                      </div>
                    </td>
                    <td>NPR {Number(order.total || 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-pill status-${String(order.payment_status || 'pending').toLowerCase()}`}>
                        {order.payment_status || 'pending'}
                      </span>
                    </td>
                    <td>{order.city || 'N/A'}</td>
                    <td>
                      <span className={`status-pill status-${String(order.status || 'pending').toLowerCase()}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td>
                      <div className="super-admin-status-actions">
                        {ORDER_STATUS_ACTIONS.map((statusAction) => (
                          <button
                            key={statusAction.value}
                            type="button"
                            className={`btn btn-sm ${String(order.status || '').toLowerCase() === statusAction.value ? 'btn-dark' : 'btn-outline-dark'}`}
                            disabled={savingOrderAction === `order-${order.id}-${statusAction.value}` || String(order.status || '').toLowerCase() === statusAction.value}
                            onClick={() => handleOrderStatusDecision(order, statusAction.value)}
                          >
                            {statusAction.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8">No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsAndFinance() {
    return (
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="table-card">
            <SectionTitle eyebrow="Financial Control" title="Commissions and payouts" align="start" />
            <div className="dashboard-metric-grid">
              <div className="dashboard-metric-card"><strong>{Number((summary?.commission_rates?.customized ?? settingsForm.customized) * 100).toFixed(0)}%</strong><span>Customized commission</span></div>
              <div className="dashboard-metric-card"><strong>{Number((summary?.commission_rates?.ready_made ?? settingsForm.ready_made) * 100).toFixed(0)}%</strong><span>Ready-made commission</span></div>
              <div className="dashboard-metric-card"><strong>NPR {Number(summary?.vendor_payout_amount || 0).toLocaleString()}</strong><span>Vendor payout total</span></div>
              <div className="dashboard-metric-card"><strong>NPR {Number(summary?.total_revenue || 0).toLocaleString()}</strong><span>Platform revenue</span></div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="table-card">
            <SectionTitle eyebrow="System Settings" title="Platform controls" align="start" />
            <form className="vendor-form-grid" onSubmit={handleSettingsSubmit}>
              <label>Customized Commission<input type="number" min="0" max="1" step="0.01" value={settingsForm.customized} onChange={(event) => setSettingsForm((current) => ({ ...current, customized: event.target.value }))} /></label>
              <label>Ready-made Commission<input type="number" min="0" max="1" step="0.01" value={settingsForm.ready_made} onChange={(event) => setSettingsForm((current) => ({ ...current, ready_made: event.target.value }))} /></label>
              <label className="vendor-form-grid__full">Support Email<input type="email" value={settingsForm.support_email} onChange={(event) => setSettingsForm((current) => ({ ...current, support_email: event.target.value }))} /></label>
              <label className="vendor-form-grid__full">Return Policy<textarea rows="4" value={settingsForm.return_policy} onChange={(event) => setSettingsForm((current) => ({ ...current, return_policy: event.target.value }))} /></label>
              <label className="vendor-checkbox-field vendor-form-grid__full"><input type="checkbox" checked={settingsForm.maintenance_mode} onChange={(event) => setSettingsForm((current) => ({ ...current, maintenance_mode: event.target.checked }))} />Maintenance mode</label>
              <div className="vendor-form-actions vendor-form-grid__full"><button type="submit" className="btn btn-dark">Save Settings</button></div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  function renderAnalyticsPage() {
    const analyticsStats = [
      { label: 'Revenue', value: `NPR ${Number(analytics?.summary?.total_revenue || 0).toLocaleString()}`, icon: 'bi-graph-up-arrow' },
      { label: 'Orders', value: String(analytics?.summary?.total_orders || 0).padStart(2, '0'), icon: 'bi-bag-check' },
      { label: 'Users', value: String(analytics?.summary?.total_users || 0).padStart(2, '0'), icon: 'bi-people' },
      { label: 'Commission', value: `NPR ${Number(analytics?.summary?.total_commission || 0).toLocaleString()}`, icon: 'bi-cash-stack' }
    ];

    if (analyticsLoading) {
      return <div className="vendor-dashboard-loading"><span className="spinner-border"></span><p>Loading analytics...</p></div>;
    }

    if (analyticsError) {
      return <div className="alert alert-danger">{analyticsError}</div>;
    }

    if (!analytics) {
      return <EmptyChart text="Analytics will load when the backend returns data." />;
    }

    return (
      <div className="super-admin-analytics">
        <div className="super-admin-page-head">
          <SectionTitle eyebrow="Analytics" title="Platform performance" text="Revenue, order mix, commission, user distribution, and seller production performance from live backend data." align="start" />
        </div>
        <div className="vendor-metrics-grid">
          {analyticsStats.map((stat) => <DashboardStatCard key={stat.label} stat={stat} />)}
        </div>

        <div className="row g-4">
          <div className="col-xl-8">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Revenue" title="Platform revenue trend" align="start" />
              <LineChart items={analytics.revenue_trend || []} valueKey="revenue" labelPrefix="NPR " />
            </div>
          </div>
          <div className="col-xl-4">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Users" title="Role distribution" align="start" />
              <DonutChart items={analytics.user_distribution || []} />
            </div>
          </div>
          <div className="col-xl-6">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Orders" title="Ready-made vs customized" align="start" />
              <GroupedBarChart items={analytics.orders_trend || []} keys={['ready_made', 'customized']} labels={{ ready_made: 'Ready-made', customized: 'Customized' }} />
            </div>
          </div>
          <div className="col-xl-6">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Commission" title="Commission over time" align="start" />
              <GroupedBarChart items={analytics.commission_trend || []} keys={['ready_made_commission', 'customized_commission']} labels={{ ready_made_commission: '10% ready-made', customized_commission: '15% customized' }} />
            </div>
          </div>
          <div className="col-xl-5">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Status" title="Operational breakdown" align="start" />
              <DonutChart items={analytics.status_breakdown || []} />
            </div>
          </div>
          <div className="col-xl-7">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Performance" title="Top vendors by revenue" align="start" />
              <GroupedBarChart items={(analytics.top_vendors || []).map((item) => ({ label: item.label, revenue: item.revenue }))} keys={['revenue']} labels={{ revenue: 'Revenue' }} />
            </div>
          </div>
          <div className="col-12">
            <div className="table-card super-admin-chart-card">
              <SectionTitle eyebrow="Tailors" title="Top tailors by completed work" align="start" />
              <GroupedBarChart items={(analytics.top_tailors || []).map((item) => ({ label: item.label, completed: item.completed, assigned: item.assigned }))} keys={['completed', 'assigned']} labels={{ completed: 'Completed', assigned: 'Assigned' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="vendor-dashboard-loading"><span className="spinner-border"></span><p>Loading super admin workspace...</p></div>;
  }

  return (
    <section className="role-module-page">
      {renderStats()}
      {status ? <div className="alert alert-info">{status}</div> : null}
      {activeSection === 'users' ? renderUsersPage() : null}
      {activeSection === 'admin-management' ? renderAdminManagementPage() : null}
      {activeSection === 'vendors' ? renderVendorsPage() : null}
      {activeSection === 'tailors' ? renderTailorsPage() : null}
      {activeSection === 'orders' ? renderOrdersPage() : null}
      {activeSection === 'analytics' ? renderAnalyticsPage() : null}
      {activeSection === 'settings' || activeSection === 'payouts' || activeSection === 'dashboard' ? renderSettingsAndFinance() : null}
      {!['users', 'admin-management', 'vendors', 'tailors', 'orders', 'analytics', 'settings', 'payouts', 'dashboard'].includes(activeSection) ? (
        <div className="table-card"><SectionTitle eyebrow="Super Admin" title={activeSection.replaceAll('-', ' ')} text="This module uses the same protected Super Admin workspace data and can be expanded with dedicated controls." align="start" /></div>
      ) : null}
    </section>
  );
}

export default SuperAdminDashboardPage;
