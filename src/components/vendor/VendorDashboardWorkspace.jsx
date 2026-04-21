import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatWorkspace from '../chat/ChatWorkspace';
import PaginatedCardList from '../common/PaginatedCardList';
import PaginatedTable from '../common/PaginatedTable';
import {
  changePassword,
  createProduct,
  deleteProduct,
  getDashboardSummary,
  listCategories,
  listOrders,
  listProductQuestions,
  listProducts,
  listReturnRequests,
  listReviews,
  listVendors,
  updateOrderStatus,
  updateProduct,
  updateProductQuestion,
  updateReturnRequest,
  updateReview,
  updateVendorProfile
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SECTION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
  { id: 'shop', label: 'Shop Profile', icon: 'bi-shop-window' },
  { id: 'products', label: 'Products', icon: 'bi-box-seam' },
  { id: 'add-product', label: 'Add Product', icon: 'bi-plus-square' },
  { id: 'customized', label: 'Customized', icon: 'bi-scissors' },
  { id: 'orders', label: 'Orders', icon: 'bi-receipt-cutoff' },
  { id: 'messages', label: 'Messages', icon: 'bi-chat-dots' },
  { id: 'returns', label: 'Returns', icon: 'bi-arrow-counterclockwise' },
  { id: 'reviews', label: 'Reviews & Questions', icon: 'bi-chat-left-text' },
  { id: 'payouts', label: 'Payouts', icon: 'bi-cash-stack' },
  { id: 'settings', label: 'Settings', icon: 'bi-gear' }
];

const DEFAULT_PRODUCT_FORM = {
  name: '',
  price: '',
  stock: '',
  category: '',
  sizes: '',
  colors: '',
  fabric_options: '',
  description: '',
  sustainability_guidance: '',
  customization_note: '',
  product_type: 'ready_made',
  is_customizable: false,
  main_image: null,
  is_active: true
};

const DEFAULT_CUSTOMIZATION = {
  customization_specialty: '',
  supported_product_types: '',
  fabrics_materials: '',
  design_specialties: '',
  measurement_requirements: '',
  customization_notes: '',
  starting_price: ''
};

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function VendorMetricCard({ label, value, icon, tone = 'default', helper }) {
  return (
    <article className={`vendor-metric-card vendor-metric-card-${tone}`}>
      <div className="vendor-metric-card__icon">
        <i className={`bi ${icon}`}></i>
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
    </article>
  );
}

function VendorSectionHeader({ title, description, action }) {
  return (
    <div className="vendor-section-header">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function VendorDashboardWorkspace({
  initialSection = 'dashboard',
  showInternalNav = true,
  showWorkspaceHeader = true
}) {
  const { user, saveProfile } = useAuth();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [summary, setSummary] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [shopForm, setShopForm] = useState({
    brand_name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    location: '',
    specialization: '',
    logo: null,
    banner: null
  });
  const [customizationForm, setCustomizationForm] = useState(DEFAULT_CUSTOMIZATION);
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT_FORM);
  const [editingProductSlug, setEditingProductSlug] = useState('');
  const [savingSection, setSavingSection] = useState('');
  const [orderDrafts, setOrderDrafts] = useState({});
  const [returnDrafts, setReturnDrafts] = useState({});
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [settingsForm, setSettingsForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: null
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [messageMode, setMessageMode] = useState('customers');
  const [adminSupportForm, setAdminSupportForm] = useState({
    support_topic: 'general_support',
    subject: 'Vendor support request'
  });
  const [adminSupportPayload, setAdminSupportPayload] = useState(null);

  const vendorScopedItems = useMemo(() => {
    if (!user) return [];
    return orders.flatMap((order) =>
      (order.items || [])
        .filter((item) => String(item.vendor_user || item.vendor_user_id || '') === String(user.id))
        .map((item) => ({ ...item, order_number: order.order_number, order_status: order.status }))
    );
  }, [orders, user]);

  const payoutTotals = useMemo(() => {
    return vendorScopedItems.reduce(
      (totals, item) => {
        const payout = Number(item.vendor_payout_amount || 0);
        const commission = Number(item.platform_commission || 0);
        const subtotal = Number(item.item_subtotal || Number(item.price || 0) * Number(item.quantity || 0));
        totals.totalEarnings += subtotal;
        totals.totalCommission += commission;
        totals.totalVendorPayout += payout;
        if ((item.payout_status || '').toLowerCase() === 'paid') {
          totals.paidAmount += payout;
        } else {
          totals.pendingAmount += payout;
        }
        return totals;
      },
      {
        totalEarnings: 0,
        totalCommission: 0,
        totalVendorPayout: 0,
        paidAmount: 0,
        pendingAmount: 0
      }
    );
  }, [vendorScopedItems]);

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => ['pending', 'processing', 'ready'].includes(String(order.status || '').toLowerCase())).length,
    [orders]
  );

  const completedOrdersCount = useMemo(
    () => orders.filter((order) => ['completed', 'delivered'].includes(String(order.status || '').toLowerCase())).length,
    [orders]
  );

  async function loadWorkspace({ silent = false } = {}) {
    if (!user) return;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const [summaryData, vendorList, productList, orderList, returnList, reviewList, questionList, categoryList] = await Promise.all([
        getDashboardSummary('vendor'),
        listVendors(),
        listProducts({ mine: 1 }),
        listOrders(),
        listReturnRequests(),
        listReviews(),
        listProductQuestions(),
        listCategories()
      ]);

      const ownVendor =
        vendorList.find((vendor) => String(vendor.user || vendor.user_detail?.id || '') === String(user.id)) || null;
      const customizationServices = ownVendor?.customization_services || {};

      setSummary(summaryData);
      setVendorProfile(ownVendor);
      setProducts(productList);
      setOrders(orderList);
      setReturns(returnList);
      setReviews(reviewList);
      setQuestions(questionList);
      setCategories(categoryList);
      setShopForm({
        brand_name: ownVendor?.brand_name || '',
        description: ownVendor?.description || '',
        contact_email: ownVendor?.contact_email || user.email || '',
        contact_phone: ownVendor?.contact_phone || user.phone || '',
        address: ownVendor?.address || '',
        location: ownVendor?.location || '',
        specialization: ownVendor?.specialization || '',
        logo: null,
        banner: null
      });
      setCustomizationForm({
        customization_specialty: customizationServices.customization_specialty || '',
        supported_product_types: (customizationServices.supported_product_types || []).join(', '),
        fabrics_materials: (customizationServices.fabrics_materials || []).join(', '),
        design_specialties: (customizationServices.design_specialties || []).join(', '),
        measurement_requirements: (customizationServices.measurement_requirements || []).join(', '),
        customization_notes: customizationServices.customization_notes || '',
        starting_price: customizationServices.starting_price || ''
      });
      setSettingsForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: null
      });
      setOrderDrafts(Object.fromEntries(orderList.map((order) => [order.id, { status: order.status || 'pending', note: '' }])));
      setReturnDrafts(
        Object.fromEntries(
          returnList.map((item) => [
            item.id,
            {
              status: item.status || 'pending',
              vendor_note: item.vendor_note || '',
              decision_resolution: item.decision_resolution || item.requested_resolution || 'manual_vendor_review'
            }
          ])
        )
      );
      setAnswerDrafts(Object.fromEntries(questionList.map((item) => [item.id, item.answer || ''])));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load the vendor workspace.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, [user]);

  useEffect(() => {
    if (SECTION_ITEMS.some((item) => item.id === initialSection)) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  useEffect(() => {
    const hashSection = String(location.hash || '').replace('#', '');
    if (hashSection && SECTION_ITEMS.some((item) => item.id === hashSection)) {
      setActiveSection(hashSection);
    }
  }, [location.hash]);

  function pushNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }

  function resetProductForm() {
    setEditingProductSlug('');
    setProductForm(DEFAULT_PRODUCT_FORM);
  }

  async function handleShopSave(event) {
    event.preventDefault();
    if (!vendorProfile?.slug) return;
    setSavingSection('shop');
    try {
      const formData = new FormData();
      Object.entries(shopForm).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });
      const updated = await updateVendorProfile(vendorProfile.slug, formData);
      setVendorProfile(updated);
      pushNotice('Shop profile updated.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to save shop profile.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleCustomizationSave(event) {
    event.preventDefault();
    if (!vendorProfile?.slug) return;
    setSavingSection('customized');
    try {
      const formData = new FormData();
      formData.append('specialization', shopForm.specialization || customizationForm.customization_specialty);
      formData.append(
        'customization_services',
        JSON.stringify({
          customization_specialty: customizationForm.customization_specialty,
          supported_product_types: splitCsv(customizationForm.supported_product_types),
          fabrics_materials: splitCsv(customizationForm.fabrics_materials),
          design_specialties: splitCsv(customizationForm.design_specialties),
          measurement_requirements: splitCsv(customizationForm.measurement_requirements),
          customization_notes: customizationForm.customization_notes,
          starting_price: customizationForm.starting_price
        })
      );
      await updateVendorProfile(vendorProfile.slug, formData);
      pushNotice('Customization services updated.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to update customization services.');
    } finally {
      setSavingSection('');
    }
  }

  function startEditProduct(product) {
    setActiveSection('add-product');
    setEditingProductSlug(product.slug);
    setProductForm({
      name: product.name || '',
      price: product.price || '',
      stock: product.stock || '',
      category: product.category || '',
      sizes: (product.sizes || []).join(', '),
      colors: (product.colors || []).join(', '),
      fabric_options: (product.fabric_options || []).join(', '),
      description: product.description || '',
      sustainability_guidance: product.sustainability_guidance || '',
      customization_note: product.customization_note || '',
      product_type: product.product_type || 'ready_made',
      is_customizable: Boolean(product.is_customizable),
      main_image: null,
      is_active: product.is_active !== false
    });
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    if (!vendorProfile?.id) {
      setError('Complete vendor setup before adding products.');
      return;
    }
    setSavingSection('product');
    try {
      const formData = new FormData();
      formData.append('vendor', vendorProfile.id);
      formData.append('name', productForm.name);
      formData.append('price', productForm.price || 0);
      formData.append('stock', productForm.stock || 0);
      formData.append('category', productForm.category);
      formData.append('description', productForm.description);
      formData.append('sustainability_guidance', productForm.sustainability_guidance);
      formData.append('product_type', productForm.product_type);
      formData.append('is_customizable', String(productForm.is_customizable));
      formData.append('is_active', String(productForm.is_active));
      formData.append('sizes', JSON.stringify(splitCsv(productForm.sizes)));
      formData.append('colors', JSON.stringify(splitCsv(productForm.colors)));
      formData.append('fabric_options', JSON.stringify(splitCsv(productForm.fabric_options)));
      if (productForm.is_customizable || productForm.product_type !== 'ready_made') {
        formData.append('customization_note', productForm.customization_note);
      }
      if (productForm.main_image) {
        formData.append('main_image', productForm.main_image);
      }

      if (editingProductSlug) {
        await updateProduct(editingProductSlug, formData);
        pushNotice('Product updated.');
      } else {
        await createProduct(formData);
        pushNotice('Product created.');
      }

      resetProductForm();
      setActiveSection('products');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to save product.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleDeleteProduct(slug) {
    if (!window.confirm('Delete this product?')) return;
    setSavingSection(`delete-${slug}`);
    try {
      await deleteProduct(slug);
      pushNotice('Product deleted.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete product.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleOrderUpdate(orderId) {
    setSavingSection(`order-${orderId}`);
    try {
      await updateOrderStatus(orderId, orderDrafts[orderId]);
      pushNotice('Order status updated.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to update order status.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleReturnUpdate(returnId) {
    setSavingSection(`return-${returnId}`);
    try {
      await updateReturnRequest(returnId, returnDrafts[returnId]);
      pushNotice('Return request updated.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to update return request.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleReviewVisibility(review) {
    setSavingSection(`review-${review.id}`);
    try {
      await updateReview(review.id, {
        status: review.status === 'hidden' ? 'active' : 'hidden'
      });
      pushNotice('Review visibility updated.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to update review.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleQuestionAnswer(question) {
    setSavingSection(`question-${question.id}`);
    try {
      await updateProductQuestion(question.id, {
        answer: answerDrafts[question.id] || '',
        status: answerDrafts[question.id] ? 'answered' : 'pending'
      });
      pushNotice('Question response saved.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to save answer.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleSettingsSave(event) {
    event.preventDefault();
    setSavingSection('settings');
    try {
      const formData = new FormData();
      formData.append('full_name', settingsForm.full_name);
      formData.append('email', settingsForm.email);
      formData.append('phone', settingsForm.phone);
      if (settingsForm.avatar) {
        formData.append('avatar', settingsForm.avatar);
      }
      await saveProfile(formData);
      pushNotice('Account profile updated.');
      await loadWorkspace({ silent: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to update profile.');
    } finally {
      setSavingSection('');
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setSavingSection('password');
    try {
      await changePassword(passwordForm);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      pushNotice('Password changed.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to change password.');
    } finally {
      setSavingSection('');
    }
  }

  function handleStartAdminSupport(event) {
    event.preventDefault();
    setMessageMode('admin');
    setAdminSupportPayload({
      kind: 'vendor_admin',
      support_topic: adminSupportForm.support_topic,
      subject: adminSupportForm.subject || 'Vendor support request'
    });
  }

  if (loading) {
    return (
      <section className="vendor-dashboard-shell">
        <div className="table-card vendor-dashboard-loading">
          <div className="spinner-border text-dark" role="status" aria-hidden="true"></div>
          <p>Loading vendor workspace...</p>
        </div>
      </section>
    );
  }

  const recentOrders = orders.slice(0, 6);
  const recentReturns = returns.slice(0, 5);
  const shopReady = Boolean(vendorProfile?.is_shop_setup_complete);
  const activeSectionLabel = SECTION_ITEMS.find((item) => item.id === activeSection)?.label || 'Vendor Dashboard';

  return (
    <section className="vendor-dashboard-shell">
      <div className={`vendor-dashboard-layout ${showInternalNav ? '' : 'vendor-dashboard-layout-single'}`}>
        {showInternalNav ? (
          <aside className="vendor-dashboard-sidebar table-card">
            <div className="vendor-dashboard-brand">
              <span>Vendor Panel</span>
              <h2>{vendorProfile?.brand_name || user?.full_name || 'Vendor Workspace'}</h2>
              <p>{shopReady ? 'Business operations dashboard' : 'Finish shop setup to start selling.'}</p>
            </div>
            <nav className="vendor-dashboard-nav" aria-label="Vendor sections">
              {SECTION_ITEMS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => setActiveSection(section.id)}
                >
                  <i className={`bi ${section.icon}`}></i>
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        ) : null}

        <div className="vendor-dashboard-content">
          {showWorkspaceHeader ? (
            <div className="vendor-dashboard-topbar">
              <div>
                <p className="eyebrow">Business Management</p>
                <h1>{activeSectionLabel}</h1>
              </div>
              <div className="vendor-dashboard-topbar__actions">
                {refreshing ? <span className="vendor-inline-status">Refreshing...</span> : null}
                <button type="button" className="btn btn-outline-dark" onClick={() => loadWorkspace({ silent: true })}>
                  Refresh
                </button>
              </div>
            </div>
          ) : refreshing ? (
            <span className="vendor-inline-status">Refreshing...</span>
          ) : null}

          {!shopReady ? (
            <div className="vendor-alert vendor-alert-warning">
              Complete your shop profile before adding products. Shop name, description, contact info, address, and specialization are required.
            </div>
          ) : null}
          {error ? <div className="vendor-alert vendor-alert-danger">{error}</div> : null}
          {notice ? <div className="vendor-alert vendor-alert-success">{notice}</div> : null}

          {activeSection === 'dashboard' ? (
            <div className="vendor-section-stack">
              <div className="vendor-metrics-grid">
                <VendorMetricCard label="Total Products" value={summary?.overview?.total_products || products.length} icon="bi-box-seam" />
                <VendorMetricCard label="Total Orders" value={summary?.overview?.total_orders || orders.length} icon="bi-receipt-cutoff" />
                <VendorMetricCard label="Pending Orders" value={pendingOrdersCount} icon="bi-hourglass-split" tone="warning" />
                <VendorMetricCard label="Completed Orders" value={completedOrdersCount} icon="bi-check2-circle" tone="success" />
                <VendorMetricCard label="Revenue" value={formatCurrency(summary?.overview?.total_revenue || payoutTotals.totalEarnings)} icon="bi-currency-dollar" />
                <VendorMetricCard label="Pending Payout" value={formatCurrency(payoutTotals.pendingAmount)} icon="bi-wallet2" helper="Released after delivery" />
              </div>

              <div className="vendor-two-column-grid">
                <div className="table-card">
                  <VendorSectionHeader title="Recent Orders" description="Latest order activity routed to your shop." />
                  {recentOrders.length ? (
                    <div className="table-responsive">
                      <table className="table align-middle vendor-data-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map((order) => (
                            <tr key={order.id}>
                              <td>{order.order_number}</td>
                              <td><span className={`status-pill status-${String(order.status || '').toLowerCase()}`}>{order.status}</span></td>
                              <td>{formatCurrency(order.total)}</td>
                              <td>{formatDate(order.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state-sm">No orders yet.</div>
                  )}
                </div>

                <div className="table-card">
                  <VendorSectionHeader title="Recent Return Requests" description="Keep an eye on post-purchase issues." />
                  {recentReturns.length ? (
                    <div className="vendor-list-stack">
                      {recentReturns.map((item) => (
                        <article key={item.id} className="vendor-compact-card">
                          <div>
                            <strong>{item.product_name}</strong>
                            <span>{item.order_number}</span>
                          </div>
                          <span className={`status-pill status-${String(item.status || '').toLowerCase()}`}>{item.status}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-sm">No return requests yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === 'shop' ? (
            <div className="table-card">
              <VendorSectionHeader title="Shop Profile" description="Complete this before adding products." />
              <form className="vendor-form-grid" onSubmit={handleShopSave}>
                <label>
                  Shop Name
                  <input value={shopForm.brand_name} onChange={(event) => setShopForm((current) => ({ ...current, brand_name: event.target.value }))} required />
                </label>
                <label>
                  Specialization
                  <input value={shopForm.specialization} onChange={(event) => setShopForm((current) => ({ ...current, specialization: event.target.value }))} required />
                </label>
                <label className="vendor-form-grid__full">
                  Description
                  <textarea rows="4" value={shopForm.description} onChange={(event) => setShopForm((current) => ({ ...current, description: event.target.value }))} required />
                </label>
                <label>
                  Contact Email
                  <input type="email" value={shopForm.contact_email} onChange={(event) => setShopForm((current) => ({ ...current, contact_email: event.target.value }))} required />
                </label>
                <label>
                  Contact Phone
                  <input value={shopForm.contact_phone} onChange={(event) => setShopForm((current) => ({ ...current, contact_phone: event.target.value }))} required />
                </label>
                <label className="vendor-form-grid__full">
                  Address
                  <input value={shopForm.address} onChange={(event) => setShopForm((current) => ({ ...current, address: event.target.value }))} required />
                </label>
                <label>
                  Location
                  <input value={shopForm.location} onChange={(event) => setShopForm((current) => ({ ...current, location: event.target.value }))} />
                </label>
                <label>
                  Logo
                  <input type="file" accept="image/*" onChange={(event) => setShopForm((current) => ({ ...current, logo: event.target.files?.[0] || null }))} />
                </label>
                <label>
                  Banner
                  <input type="file" accept="image/*" onChange={(event) => setShopForm((current) => ({ ...current, banner: event.target.files?.[0] || null }))} />
                </label>
                <div className="vendor-form-actions vendor-form-grid__full">
                  <button type="submit" className="btn btn-dark" disabled={savingSection === 'shop'}>
                    {savingSection === 'shop' ? 'Saving...' : 'Save Shop Profile'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {activeSection === 'products' ? (
            <div className="table-card vendor-products-panel">
              <VendorSectionHeader
                title="Products"
                description="Manage stock, positioning, and product type."
                action={<button type="button" className="btn btn-dark" onClick={() => { resetProductForm(); setActiveSection('add-product'); }}>Add Product</button>}
              />
              {products.length ? (
                <PaginatedTable
                  items={products}
                  columns={[
                    { key: 'product', label: 'Product' },
                    { key: 'type', label: 'Type' },
                    { key: 'stock', label: 'Stock' },
                    { key: 'price', label: 'Price' },
                    { key: 'sizes', label: 'Sizes' },
                    { key: 'actions', label: '' }
                  ]}
                  tableClassName="vendor-data-table"
                  itemLabel="products"
                  initialPageSize={5}
                  renderRow={(product, _index, key) => (
                    <tr key={key}>
                      <td>
                        <strong>{product.name}</strong>
                        <div className="vendor-table-meta">{product.category_name || product.category_detail?.name || 'Uncategorized'}</div>
                      </td>
                      <td>{product.product_type || 'ready_made'}</td>
                      <td>{product.stock ?? 0}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{(product.sizes || []).join(', ') || 'N/A'}</td>
                      <td className="vendor-table-actions">
                        <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => startEditProduct(product)}>Edit</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={savingSection === `delete-${product.slug}`} onClick={() => handleDeleteProduct(product.slug)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )}
                />
              ) : (
                <div className="empty-state-sm">No products yet. Add your first product after completing the shop profile.</div>
              )}
            </div>
          ) : null}

          {activeSection === 'add-product' ? (
            <div className="table-card">
              <VendorSectionHeader title={editingProductSlug ? 'Edit Product' : 'Add Product'} description="Create products with vendor-managed sizes and clear business rules." />
              <form className="vendor-form-grid" onSubmit={handleProductSubmit}>
                <label>
                  Product Name
                  <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label>
                  Category
                  <select value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} required>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Price
                  <input type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} required />
                </label>
                <label>
                  Stock
                  <input type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))} required />
                </label>
                <label>
                  Product Type
                  <select value={productForm.product_type} onChange={(event) => setProductForm((current) => ({ ...current, product_type: event.target.value, is_customizable: event.target.value !== 'ready_made' }))}>
                    <option value="ready_made">Ready-made</option>
                    <option value="customizable">Customizable</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                <label className="vendor-checkbox-field">
                  <input type="checkbox" checked={productForm.is_customizable} onChange={(event) => setProductForm((current) => ({ ...current, is_customizable: event.target.checked }))} />
                  <span>Supports customization</span>
                </label>
                <label>
                  Sizes
                  <input placeholder="S, M, L, XL" value={productForm.sizes} onChange={(event) => setProductForm((current) => ({ ...current, sizes: event.target.value }))} />
                </label>
                <label>
                  Colors
                  <input placeholder="Black, Ivory, Blue" value={productForm.colors} onChange={(event) => setProductForm((current) => ({ ...current, colors: event.target.value }))} />
                </label>
                <label>
                  Fabrics
                  <input placeholder="Cotton, Linen Blend" value={productForm.fabric_options} onChange={(event) => setProductForm((current) => ({ ...current, fabric_options: event.target.value }))} />
                </label>
                <label>
                  Main Image
                  <input type="file" accept="image/*" onChange={(event) => setProductForm((current) => ({ ...current, main_image: event.target.files?.[0] || null }))} />
                </label>
                <label className="vendor-form-grid__full">
                  Description
                  <textarea rows="5" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} required />
                </label>
                <label className="vendor-form-grid__full">
                  Sustainability Guidance
                  <textarea rows="3" placeholder="Keep this short, useful, and professional." value={productForm.sustainability_guidance} onChange={(event) => setProductForm((current) => ({ ...current, sustainability_guidance: event.target.value }))} />
                </label>
                {(productForm.is_customizable || productForm.product_type !== 'ready_made') ? (
                  <label className="vendor-form-grid__full">
                    Customization Note
                    <textarea rows="3" placeholder="Explain measurements, design options, or tailoring notes." value={productForm.customization_note} onChange={(event) => setProductForm((current) => ({ ...current, customization_note: event.target.value }))} />
                  </label>
                ) : null}
                <div className="vendor-form-actions vendor-form-grid__full">
                  <button type="submit" className="btn btn-dark" disabled={savingSection === 'product' || !shopReady}>
                    {savingSection === 'product' ? 'Saving...' : editingProductSlug ? 'Update Product' : 'Create Product'}
                  </button>
                  {editingProductSlug ? (
                    <button type="button" className="btn btn-outline-dark" onClick={resetProductForm}>
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}

          {activeSection === 'customized' ? (
            <div className="table-card">
              <VendorSectionHeader title="Customized Services" description="Define your tailoring and custom design offering separately from ready-made products." />
              <form className="vendor-form-grid" onSubmit={handleCustomizationSave}>
                <label>
                  Customization Specialty
                  <input value={customizationForm.customization_specialty} onChange={(event) => setCustomizationForm((current) => ({ ...current, customization_specialty: event.target.value }))} />
                </label>
                <label>
                  Starting Price Guidance
                  <input value={customizationForm.starting_price} onChange={(event) => setCustomizationForm((current) => ({ ...current, starting_price: event.target.value }))} />
                </label>
                <label className="vendor-form-grid__full">
                  Supported Product Types
                  <input placeholder="Kurta, Sherwani, Blazer" value={customizationForm.supported_product_types} onChange={(event) => setCustomizationForm((current) => ({ ...current, supported_product_types: event.target.value }))} />
                </label>
                <label className="vendor-form-grid__full">
                  Fabrics / Materials
                  <input placeholder="Silk Blend, Cotton, Linen" value={customizationForm.fabrics_materials} onChange={(event) => setCustomizationForm((current) => ({ ...current, fabrics_materials: event.target.value }))} />
                </label>
                <label className="vendor-form-grid__full">
                  Design Specialties
                  <input placeholder="Minimal tailoring, Nepali motifs" value={customizationForm.design_specialties} onChange={(event) => setCustomizationForm((current) => ({ ...current, design_specialties: event.target.value }))} />
                </label>
                <label className="vendor-form-grid__full">
                  Measurement Requirements
                  <input placeholder="Chest, waist, shoulder, inseam" value={customizationForm.measurement_requirements} onChange={(event) => setCustomizationForm((current) => ({ ...current, measurement_requirements: event.target.value }))} />
                </label>
                <label className="vendor-form-grid__full">
                  Customization Notes
                  <textarea rows="4" value={customizationForm.customization_notes} onChange={(event) => setCustomizationForm((current) => ({ ...current, customization_notes: event.target.value }))} />
                </label>
                <div className="vendor-form-actions vendor-form-grid__full">
                  <button type="submit" className="btn btn-dark" disabled={savingSection === 'customized'}>
                    {savingSection === 'customized' ? 'Saving...' : 'Save Customized Services'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {activeSection === 'orders' ? (
            <div className="table-card">
              <VendorSectionHeader title="Orders" description="Only vendor-routed orders are shown here. Update fulfillment status as work progresses." />
              {orders.length ? (
                <PaginatedCardList
                  items={orders}
                  itemLabel="orders"
                  initialPageSize={5}
                  className="vendor-order-stack"
                  renderItem={(order) => (
                    <article key={order.id} className="vendor-order-card">
                      <div className="vendor-order-card__header">
                        <div>
                          <strong>{order.order_number}</strong>
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                        <span className={`status-pill status-${String(order.status || '').toLowerCase()}`}>{order.status}</span>
                      </div>
                      <div className="vendor-order-card__items">
                        {(order.items || [])
                          .filter((item) => String(item.vendor_user || item.vendor_user_id || '') === String(user?.id))
                          .map((item) => (
                            <div key={item.id} className="vendor-order-line">
                              <span>{item.product_name}</span>
                              <span>{item.quantity} x {formatCurrency(item.price)}</span>
                            </div>
                          ))}
                      </div>
                      <div className="vendor-order-card__controls">
                        <select value={orderDrafts[order.id]?.status || order.status} onChange={(event) => setOrderDrafts((current) => ({ ...current, [order.id]: { ...(current[order.id] || {}), status: event.target.value } }))}>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="ready">Ready</option>
                          <option value="completed">Completed</option>
                          <option value="delivered">Delivered</option>
                        </select>
                        <input placeholder="Status note" value={orderDrafts[order.id]?.note || ''} onChange={(event) => setOrderDrafts((current) => ({ ...current, [order.id]: { ...(current[order.id] || {}), note: event.target.value } }))} />
                        <button type="button" className="btn btn-dark" disabled={savingSection === `order-${order.id}`} onClick={() => handleOrderUpdate(order.id)}>
                          Update
                        </button>
                      </div>
                    </article>
                  )}
                />
              ) : (
                <div className="empty-state-sm">No vendor orders yet.</div>
              )}
            </div>
          ) : null}

          {activeSection === 'messages' ? (
            <div className="vendor-section-stack">
              <div className="table-card vendor-messaging-controls">
                <VendorSectionHeader
                  title="Messages"
                  description="Reply to customers and contact admin support from one vendor inbox."
                  action={
                    <div className="vendor-message-tabs" role="tablist" aria-label="Message filters">
                      <button type="button" className={messageMode === 'customers' ? 'active' : ''} onClick={() => setMessageMode('customers')}>
                        Customers
                      </button>
                      <button type="button" className={messageMode === 'admin' ? 'active' : ''} onClick={() => setMessageMode('admin')}>
                        Admin Support
                      </button>
                    </div>
                  }
                />
                {messageMode === 'admin' ? (
                  <form className="vendor-admin-support-form" onSubmit={handleStartAdminSupport}>
                    <label>
                      Support Topic
                      <select value={adminSupportForm.support_topic} onChange={(event) => setAdminSupportForm((current) => ({ ...current, support_topic: event.target.value }))}>
                        <option value="general_support">General Support</option>
                        <option value="payout_issue">Payout Issue</option>
                        <option value="order_dispute">Order Dispute</option>
                        <option value="product_approval">Product Approval</option>
                        <option value="technical_problem">Technical Problem</option>
                      </select>
                    </label>
                    <label>
                      Subject
                      <input value={adminSupportForm.subject} onChange={(event) => setAdminSupportForm((current) => ({ ...current, subject: event.target.value }))} placeholder="What do you need help with?" />
                    </label>
                    <button type="submit" className="btn btn-dark">Contact Admin</button>
                  </form>
                ) : null}
              </div>
              <div className="table-card">
                {messageMode === 'customers' ? (
              <ChatWorkspace
                kind="customer_vendor"
                title="Customer ↔ Vendor Messages"
                description="Reply to product, stock, delivery, customization, and post-order questions from your customers."
                emptyTitle="No customer conversations yet"
                emptyDescription="New product and order-related chats will appear here."
              />
                ) : (
                  <ChatWorkspace
                    kind="vendor_admin"
                    autoStartPayload={adminSupportPayload}
                    title="Vendor to Admin Support"
                    description="Discuss payout issues, product approval, order disputes, and technical problems with platform admins."
                    emptyTitle="No admin support threads yet"
                    emptyDescription="Choose a topic above and contact admin to open a support conversation."
                  />
                )}
              </div>
            </div>
          ) : null}

          {activeSection === 'returns' ? (
            <div className="table-card">
              <VendorSectionHeader title="Returns" description="Review requests and decide between refund, exchange, voucher, or manual handling." />
              {returns.length ? (
                <div className="vendor-order-stack">
                  {returns.map((item) => (
                    <article key={item.id} className="vendor-order-card">
                      <div className="vendor-order-card__header">
                        <div>
                          <strong>{item.product_name}</strong>
                          <span>{item.order_number}</span>
                        </div>
                        <span className={`status-pill status-${String(item.status || '').toLowerCase()}`}>{item.status}</span>
                      </div>
                      <p className="vendor-supporting-copy"><strong>Reason:</strong> {item.reason}</p>
                      {item.description ? <p className="vendor-supporting-copy">{item.description}</p> : null}
                      <div className="vendor-order-card__controls vendor-order-card__controls-stacked">
                        <select value={returnDrafts[item.id]?.status || item.status} onChange={(event) => setReturnDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), status: event.target.value } }))}>
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved_refund">Approve Refund</option>
                          <option value="approved_exchange">Approve Exchange</option>
                          <option value="approved_voucher">Approve Voucher</option>
                          <option value="more_info_requested">Need More Info</option>
                          <option value="rejected">Reject</option>
                          <option value="completed">Completed</option>
                        </select>
                        <select value={returnDrafts[item.id]?.decision_resolution || item.requested_resolution} onChange={(event) => setReturnDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), decision_resolution: event.target.value } }))}>
                          <option value="full_refund">Refund</option>
                          <option value="exchange">Exchange</option>
                          <option value="voucher">Voucher</option>
                          <option value="manual_vendor_review">Manual Review</option>
                        </select>
                        <textarea rows="3" placeholder="Vendor note" value={returnDrafts[item.id]?.vendor_note || ''} onChange={(event) => setReturnDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), vendor_note: event.target.value } }))} />
                        <button type="button" className="btn btn-dark" disabled={savingSection === `return-${item.id}`} onClick={() => handleReturnUpdate(item.id)}>
                          Save Decision
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state-sm">No return cases assigned to your shop.</div>
              )}
            </div>
          ) : null}

          {activeSection === 'reviews' ? (
            <div className="vendor-section-stack">
              <div className="table-card">
                <VendorSectionHeader title="Reviews" description="Monitor product feedback and moderate visibility when required." />
                {reviews.length ? (
                  <div className="vendor-list-stack">
                    {reviews.map((review) => (
                      <article key={review.id} className="vendor-compact-card vendor-compact-card-column">
                        <div className="vendor-compact-card__row">
                          <strong>{review.product_name}</strong>
                          <span className={`status-pill status-${review.status}`}>{review.status}</span>
                        </div>
                        <div className="vendor-supporting-copy">{review.rating}/5 by {review.user_name || 'Customer'} on {formatDate(review.created_at)}</div>
                        <p>{review.comment}</p>
                        <button type="button" className="btn btn-sm btn-outline-dark" disabled={savingSection === `review-${review.id}`} onClick={() => handleReviewVisibility(review)}>
                          {review.status === 'hidden' ? 'Show Review' : 'Hide Review'}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-sm">No reviews yet.</div>
                )}
              </div>

              <div className="table-card">
                <VendorSectionHeader title="Product Questions" description="Respond to buyer questions before they drop off." />
                {questions.length ? (
                  <div className="vendor-list-stack">
                    {questions.map((question) => (
                      <article key={question.id} className="vendor-compact-card vendor-compact-card-column">
                        <div className="vendor-compact-card__row">
                          <strong>{question.product_name}</strong>
                          <span className={`status-pill status-${question.status}`}>{question.status}</span>
                        </div>
                        <p>{question.question}</p>
                        <textarea rows="3" placeholder="Write your answer" value={answerDrafts[question.id] || ''} onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))} />
                        <button type="button" className="btn btn-dark btn-sm align-self-start" disabled={savingSection === `question-${question.id}`} onClick={() => handleQuestionAnswer(question)}>
                          Save Response
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-sm">No questions yet.</div>
                )}
              </div>
            </div>
          ) : null}

          {activeSection === 'payouts' ? (
            <div className="vendor-section-stack">
              <div className="vendor-metrics-grid">
                <VendorMetricCard label="Total Earnings" value={formatCurrency(payoutTotals.totalEarnings)} icon="bi-graph-up-arrow" />
                <VendorMetricCard label="Commission" value={formatCurrency(payoutTotals.totalCommission)} icon="bi-percent" tone="warning" helper="15% customized / 10% ready-made" />
                <VendorMetricCard label="Pending Payout" value={formatCurrency(payoutTotals.pendingAmount)} icon="bi-wallet2" />
                <VendorMetricCard label="Paid Amount" value={formatCurrency(payoutTotals.paidAmount)} icon="bi-check2-square" tone="success" />
              </div>

              <div className="table-card">
                <VendorSectionHeader title="Payout Breakdown" description="Payout becomes eligible only after delivery or completion." />
                {vendorScopedItems.length ? (
                  <div className="table-responsive">
                    <table className="table align-middle vendor-data-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Product</th>
                          <th>Type</th>
                          <th>Commission</th>
                          <th>Payout</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorScopedItems.map((item) => (
                          <tr key={`${item.order_number}-${item.id}`}>
                            <td>{item.order_number}</td>
                            <td>{item.product_name}</td>
                            <td>{item.is_customized ? 'Customized' : item.product_type || 'Ready-made'}</td>
                            <td>{formatCurrency(item.platform_commission)}</td>
                            <td>{formatCurrency(item.vendor_payout_amount)}</td>
                            <td><span className={`status-pill status-${String(item.payout_status || '').toLowerCase()}`}>{item.payout_status || 'pending'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-sm">No payout data yet.</div>
                )}
              </div>
            </div>
          ) : null}

          {activeSection === 'settings' ? (
            <div className="vendor-section-stack">
              <div className="table-card">
                <VendorSectionHeader title="Profile Settings" description="Update your account-level information." />
                <form className="vendor-form-grid" onSubmit={handleSettingsSave}>
                  <label>
                    Full Name
                    <input value={settingsForm.full_name} onChange={(event) => setSettingsForm((current) => ({ ...current, full_name: event.target.value }))} required />
                  </label>
                  <label>
                    Email
                    <input type="email" value={settingsForm.email} onChange={(event) => setSettingsForm((current) => ({ ...current, email: event.target.value }))} required />
                  </label>
                  <label>
                    Phone
                    <input value={settingsForm.phone} onChange={(event) => setSettingsForm((current) => ({ ...current, phone: event.target.value }))} />
                  </label>
                  <label>
                    Avatar
                    <input type="file" accept="image/*" onChange={(event) => setSettingsForm((current) => ({ ...current, avatar: event.target.files?.[0] || null }))} />
                  </label>
                  <div className="vendor-form-actions vendor-form-grid__full">
                    <button type="submit" className="btn btn-dark" disabled={savingSection === 'settings'}>
                      {savingSection === 'settings' ? 'Saving...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="table-card">
                <VendorSectionHeader title="Password" description="Change your account password securely." />
                <form className="vendor-form-grid" onSubmit={handlePasswordChange}>
                  <label>
                    Current Password
                    <input type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} required />
                  </label>
                  <label>
                    New Password
                    <input type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} required />
                  </label>
                  <label>
                    Confirm Password
                    <input type="password" value={passwordForm.confirm_password} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))} required />
                  </label>
                  <div className="vendor-form-actions vendor-form-grid__full">
                    <button type="submit" className="btn btn-dark" disabled={savingSection === 'password'}>
                      {savingSection === 'password' ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default VendorDashboardWorkspace;
