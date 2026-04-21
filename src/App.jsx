import { Navigate, Route, Routes } from 'react-router-dom';
import RoleRoute from './components/auth/RoleRoute';
import StorefrontRoute from './components/auth/StorefrontRoute';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import TailorLayout from './components/layout/TailorLayout';
import VendorLayout from './components/layout/VendorLayout';
import AboutPage from './pages/AboutPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ApplyVendorPage from './pages/ApplyVendorPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ContactPage from './pages/ContactPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import DashboardEntryPage from './pages/DashboardEntryPage';
import GoogleAuthCallbackPage from './pages/GoogleAuthCallbackPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import NotAuthorizedPage from './pages/NotAuthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentPage from './pages/PaymentPage';
import PlaceholderPage from './pages/PlaceholderPage';
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
import { ROUTE_PATHS } from './routes/config';

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
        <Route path={ROUTE_PATHS.home} element={<HomePage />} />
        <Route path={ROUTE_PATHS.about} element={<AboutPage />} />
        <Route path={ROUTE_PATHS.contact} element={<ContactPage />} />
        <Route path={ROUTE_PATHS.applyVendor} element={<ApplyVendorPage />} />
        <Route path={ROUTE_PATHS.notAuthorized} element={<NotAuthorizedPage />} />
        <Route path={ROUTE_PATHS.login} element={<LoginPage />} />
        <Route path={ROUTE_PATHS.register} element={<Navigate to={ROUTE_PATHS.signup} replace />} />
        <Route path={ROUTE_PATHS.signup} element={<SignupPage />} />
        <Route path={ROUTE_PATHS.googleCallback} element={<GoogleAuthCallbackPage />} />

        <Route path={ROUTE_PATHS.products} element={<Navigate to={ROUTE_PATHS.shop} replace />} />
        <Route path={ROUTE_PATHS.shop} element={<StorefrontRoute><ShopPage /></StorefrontRoute>} />
        <Route path={ROUTE_PATHS.productDetails} element={<StorefrontRoute><ProductDetailsPage /></StorefrontRoute>} />
        <Route
          path={ROUTE_PATHS.categories}
          element={
            <PlaceholderPage
              eyebrow="Categories"
              title="Browse categories"
              description="Category landing is connected and ready. Use the product catalog while dedicated category collections are expanded."
              primaryLink={{ to: ROUTE_PATHS.shop, label: 'Open Products' }}
              secondaryLink={{ to: ROUTE_PATHS.home, label: 'Back to Home' }}
            />
          }
        />
        <Route path={ROUTE_PATHS.tailoring} element={<StorefrontRoute><TailoringPage /></StorefrontRoute>} />
        <Route path={ROUTE_PATHS.tailoringRequestDetails} element={<RoleRoute allowedRoles={['customer']}><TailoringRequestDetailPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.recommendations} element={<StorefrontRoute><RecommendationsPage /></StorefrontRoute>} />

        <Route path={ROUTE_PATHS.dashboard} element={<DashboardEntryPage />} />
        <Route path={ROUTE_PATHS.customerDashboard} element={<RoleRoute allowedRoles={['customer']}><CustomerDashboardPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.orders} element={<RoleRoute allowedRoles={['customer']}><CustomerDashboardPage initialFocusSection="orders" /></RoleRoute>} />
        <Route path={ROUTE_PATHS.orderDetails} element={<RoleRoute allowedRoles={['customer']}><TrackingPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.returns} element={<RoleRoute allowedRoles={['customer']}><CustomerDashboardPage initialFocusSection="returns" /></RoleRoute>} />
        <Route path={ROUTE_PATHS.reviews} element={<RoleRoute allowedRoles={['customer']}><CustomerDashboardPage initialFocusSection="reviews" /></RoleRoute>} />
        <Route path={ROUTE_PATHS.profile} element={<RoleRoute allowedRoles={['customer']}><CustomerDashboardPage initialFocusSection="profile" /></RoleRoute>} />
        <Route
          path={ROUTE_PATHS.settings}
          element={
            <RoleRoute allowedRoles={['customer']}>
              <PlaceholderPage
                eyebrow="Account Settings"
                title="Customer settings"
                description="Settings routing is connected. Hook account preferences and password controls into this page next."
                primaryLink={{ to: ROUTE_PATHS.profile, label: 'Open Profile' }}
                secondaryLink={{ to: ROUTE_PATHS.customerDashboard, label: 'Back to Dashboard' }}
              />
            </RoleRoute>
          }
        />
        <Route path={ROUTE_PATHS.messages} element={<RoleRoute allowedRoles={['customer']}><MessagesPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.messagesChats} element={<RoleRoute allowedRoles={['customer']}><MessagesPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.messageConversation} element={<RoleRoute allowedRoles={['customer']}><MessagesPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.wishlist} element={<RoleRoute allowedRoles={['customer']}><WishlistPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.cart} element={<RoleRoute allowedRoles={['customer']}><CartPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.checkout} element={<RoleRoute allowedRoles={['customer']}><CheckoutPage /></RoleRoute>} />
        <Route path="/checkout/payment/:provider/:paymentId" element={<RoleRoute allowedRoles={['customer']}><PaymentPage /></RoleRoute>} />
        <Route path={ROUTE_PATHS.trackOrder} element={<RoleRoute allowedRoles={['customer']}><TrackingPage /></RoleRoute>} />
      </Route>

      <Route path={ROUTE_PATHS.vendorDashboard} element={<RoleRoute allowedRoles={['vendor']}><VendorLayout /></RoleRoute>}>
        <Route index element={<VendorDashboardPage />} />
        <Route path="products" element={<VendorDashboardPage />} />
        <Route path="orders" element={<VendorDashboardPage />} />
        <Route path="returns" element={<VendorDashboardPage />} />
        <Route path=":section" element={<VendorDashboardPage />} />
      </Route>

      <Route path={ROUTE_PATHS.tailorDashboard} element={<RoleRoute allowedRoles={['tailor']}><TailorLayout /></RoleRoute>}>
        <Route index element={<TailorDashboardPage />} />
        <Route path="earnings" element={<TailorDashboardPage />} />
        <Route path="settings" element={<TailorDashboardPage />} />
        <Route path=":section" element={<TailorDashboardPage />} />
      </Route>

      <Route path={ROUTE_PATHS.adminDashboard} element={<RoleRoute allowedRoles={['admin']}><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminDashboardPage />} />
        <Route path="vendor-applications" element={<AdminDashboardPage />} />
        <Route path="vendors" element={<AdminDashboardPage />} />
        <Route path="orders" element={<AdminDashboardPage />} />
        <Route path="tailoring-requests" element={<AdminDashboardPage />} />
        <Route path="returns" element={<AdminDashboardPage />} />
        <Route path="reviews" element={<AdminDashboardPage />} />
        <Route path="payouts" element={<AdminDashboardPage />} />
        <Route path="reviews-questions" element={<AdminDashboardPage />} />
        <Route path="contact-messages" element={<AdminDashboardPage />} />
        <Route path="vendor-support" element={<AdminDashboardPage />} />
        <Route path="analytics" element={<AdminDashboardPage />} />
        <Route path="tailor-applications" element={<RolePanelPage role="admin" title="Tailor Applications" description="Dedicated admin route for tailor onboarding review, separated from vendor applications." cards={adminModuleCards.tailorApplications} />} />
        <Route path="tailors" element={<RolePanelPage role="admin" title="Tailors" description="Admin-only tailor management route with no customer UI or vendor workspace controls." cards={adminModuleCards.tailors} />} />
        <Route path="settings" element={<RolePanelPage role="admin" title="Settings" description="Admin configuration lives inside the admin panel and preserves backend role permissions." cards={adminModuleCards.settings} />} />
      </Route>

      <Route path={ROUTE_PATHS.superAdminDashboard} element={<RoleRoute allowedRoles={['super_admin']}><SuperAdminLayout /></RoleRoute>}>
        <Route index element={<SuperAdminDashboardPage />} />
        <Route path=":section" element={<SuperAdminDashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
