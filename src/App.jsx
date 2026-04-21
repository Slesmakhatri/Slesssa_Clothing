import { Route, Routes } from 'react-router-dom';
import RoleRoute from './components/auth/RoleRoute';
import StorefrontRoute from './components/auth/StorefrontRoute';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import TailorLayout from './components/layout/TailorLayout';
import VendorLayout from './components/layout/VendorLayout';
import AboutPage from './pages/AboutPage';
import ApplyVendorPage from './pages/ApplyVendorPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ContactPage from './pages/ContactPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import GoogleAuthCallbackPage from './pages/GoogleAuthCallbackPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import PaymentPage from './pages/PaymentPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import RolePanelPage from './pages/RolePanelPage';
import ShopPage from './pages/ShopPage';
import SignupPage from './pages/SignupPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import TailorDashboardPage from './pages/TailorDashboardPage';
import TailoringPage from './pages/TailoringPage';
import TailoringRequestDetailPage from './pages/TailoringRequestDetailPage';
import TrackingPage from './pages/TrackingPage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import WishlistPage from './pages/WishlistPage';

const tailorModuleCards = {
  progress: [
    { title: 'Status Notes', body: 'Track work-in-progress updates for assigned tailoring requests.', icon: 'bi-activity' },
    { title: 'Customer Proofs', body: 'Keep progress communication focused on tailoring production.', icon: 'bi-image' },
    { title: 'Delivery Readiness', body: 'Prepare completion updates without storefront shopping tools.', icon: 'bi-check2-circle' }
  ],
  completed: [
    { title: 'Completed Requests', body: 'Review finished tailoring assignments and handoff status.', icon: 'bi-check2-circle' },
    { title: 'Quality Notes', body: 'Keep tailoring completion details separate from vendor product flows.', icon: 'bi-journal-check' },
    { title: 'Customer History', body: 'Reference completed request context from the tailor workspace.', icon: 'bi-person-lines-fill' }
  ],
  earnings: [
    { title: 'Tailor Earnings', body: 'View tailoring-work earnings and pending release status.', icon: 'bi-cash-stack' },
    { title: 'Completed Work Basis', body: 'Earnings are tied to completed tailoring assignments.', icon: 'bi-scissors' },
    { title: 'Payout Tracking', body: 'Keep tailor payout visibility separate from vendor payouts.', icon: 'bi-wallet2' }
  ],
  settings: [
    { title: 'Profile Details', body: 'Manage tailor account information from the tailor dashboard only.', icon: 'bi-person-gear' },
    { title: 'Availability', body: 'Reserve this area for tailor availability and service preferences.', icon: 'bi-calendar-check' },
    { title: 'Security', body: 'Keep account controls inside the tailor workspace.', icon: 'bi-shield-lock' }
  ]
};

const adminModuleCards = {
  tailors: [
    { title: 'Tailor Directory', body: 'Review tailor accounts without customer storefront tools.', icon: 'bi-scissors' },
    { title: 'Assignment Oversight', body: 'Monitor tailor capacity and workflow health.', icon: 'bi-diagram-3' },
    { title: 'Operational Status', body: 'Keep tailor administration inside the admin panel.', icon: 'bi-sliders' }
  ],
  tailorApplications: [
    { title: 'Tailor Review Queue', body: 'Dedicated admin page for future tailor application approvals.', icon: 'bi-clipboard-check' },
    { title: 'Credential Checks', body: 'Track portfolio, specialty, and onboarding decisions.', icon: 'bi-patch-check' },
    { title: 'Approval Actions', body: 'Keep tailor onboarding distinct from vendor applications.', icon: 'bi-person-check' }
  ],
  settings: [
    { title: 'Platform Settings', body: 'Manage operational settings from the admin panel.', icon: 'bi-gear' },
    { title: 'Access Policy', body: 'Preserve backend role permissions while organizing UI modules.', icon: 'bi-shield-lock' },
    { title: 'Workspace Controls', body: 'Keep admin configuration separate from shopping flows.', icon: 'bi-ui-checks-grid' }
  ]
};

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/apply-vendor" element={<ApplyVendorPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/shop" element={<StorefrontRoute><ShopPage /></StorefrontRoute>} />
        <Route path="/shop/:productId" element={<StorefrontRoute><ProductDetailsPage /></StorefrontRoute>} />
        <Route path="/wishlist" element={<StorefrontRoute><WishlistPage /></StorefrontRoute>} />
        <Route path="/tailoring" element={<StorefrontRoute><TailoringPage /></StorefrontRoute>} />
        <Route path="/tailoring/requests/:requestId" element={<StorefrontRoute><RoleRoute allowedRoles={['customer']}><TailoringRequestDetailPage /></RoleRoute></StorefrontRoute>} />
        <Route path="/recommendations" element={<StorefrontRoute><RecommendationsPage /></StorefrontRoute>} />
        <Route path="/cart" element={<StorefrontRoute><CartPage /></StorefrontRoute>} />
        <Route path="/checkout" element={<StorefrontRoute><CheckoutPage /></StorefrontRoute>} />
        <Route path="/checkout/payment/:provider/:paymentId" element={<StorefrontRoute><PaymentPage /></StorefrontRoute>} />
        <Route path="/messages" element={<StorefrontRoute><RoleRoute allowedRoles={['customer']}><MessagesPage /></RoleRoute></StorefrontRoute>} />
        <Route path="/orders" element={<StorefrontRoute><RoleRoute allowedRoles={['customer']}><CustomerDashboardPage /></RoleRoute></StorefrontRoute>} />
        <Route path="/returns" element={<StorefrontRoute><RoleRoute allowedRoles={['customer']}><CustomerDashboardPage /></RoleRoute></StorefrontRoute>} />
        <Route path="/profile" element={<StorefrontRoute><RoleRoute allowedRoles={['customer']}><CustomerDashboardPage /></RoleRoute></StorefrontRoute>} />
        <Route path="/track-order" element={<StorefrontRoute><TrackingPage /></StorefrontRoute>} />
        <Route path="/dashboard/customer" element={<StorefrontRoute><RoleRoute allowedRoles={['customer']}><CustomerDashboardPage /></RoleRoute></StorefrontRoute>} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<VendorLayout />}>
        <Route path="/dashboard/vendor" element={<RoleRoute allowedRoles={['vendor']}><VendorDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/vendor/:section" element={<RoleRoute allowedRoles={['vendor']}><VendorDashboardPage /></RoleRoute>} />
      </Route>

      <Route element={<TailorLayout />}>
        <Route path="/dashboard/tailor" element={<RoleRoute allowedRoles={['tailor']}><TailorDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/tailor/earnings" element={<RoleRoute allowedRoles={['tailor']}><RolePanelPage role="tailor" title="Earnings" description="Tailor earnings and payout visibility stays separate from vendor payout operations." cards={tailorModuleCards.earnings} /></RoleRoute>} />
        <Route path="/dashboard/tailor/settings" element={<RoleRoute allowedRoles={['tailor']}><RolePanelPage role="tailor" title="Settings" description="Tailor account and workspace settings are isolated from customer and vendor experiences." cards={tailorModuleCards.settings} /></RoleRoute>} />
        <Route path="/dashboard/tailor/:section" element={<RoleRoute allowedRoles={['tailor']}><TailorDashboardPage /></RoleRoute>} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/dashboard/admin" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/users" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/vendor-applications" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/vendors" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/orders" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/tailoring-requests" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/returns" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/payouts" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/reviews-questions" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/contact-messages" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/vendor-support" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/analytics" element={<RoleRoute allowedRoles={['admin']}><AdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/admin/tailor-applications" element={<RoleRoute allowedRoles={['admin']}><RolePanelPage role="admin" title="Tailor Applications" description="Dedicated admin route for tailor onboarding review, separated from vendor applications." cards={adminModuleCards.tailorApplications} /></RoleRoute>} />
        <Route path="/dashboard/admin/tailors" element={<RoleRoute allowedRoles={['admin']}><RolePanelPage role="admin" title="Tailors" description="Admin-only tailor management route with no customer UI or vendor workspace controls." cards={adminModuleCards.tailors} /></RoleRoute>} />
        <Route path="/dashboard/admin/settings" element={<RoleRoute allowedRoles={['admin']}><RolePanelPage role="admin" title="Settings" description="Admin configuration lives inside the admin panel and preserves backend role permissions." cards={adminModuleCards.settings} /></RoleRoute>} />
      </Route>

      <Route element={<SuperAdminLayout />}>
        <Route path="/dashboard/super-admin" element={<RoleRoute allowedRoles={['super_admin']}><SuperAdminDashboardPage /></RoleRoute>} />
        <Route path="/dashboard/super-admin/:section" element={<RoleRoute allowedRoles={['super_admin']}><SuperAdminDashboardPage /></RoleRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
