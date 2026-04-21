export const ROUTE_PATHS = {
  home: '/',
  about: '/about',
  contact: '/contact',
  login: '/login',
  register: '/register',
  signup: '/signup',
  notAuthorized: '/not-authorized',
  products: '/products',
  shop: '/shop',
  productDetails: '/shop/:productId',
  categories: '/categories',
  cart: '/cart',
  checkout: '/checkout',
  wishlist: '/wishlist',
  tailoring: '/tailoring',
  tailoringRequestDetails: '/tailoring/requests/:requestId',
  recommendations: '/recommendations',
  messages: '/messages',
  messagesChats: '/messages/chats',
  messageConversation: '/messages/chats/:conversationId',
  dashboard: '/dashboard',
  customerDashboard: '/dashboard/customer',
  orders: '/orders',
  orderDetails: '/orders/:orderId',
  returns: '/returns',
  reviews: '/reviews',
  profile: '/profile',
  settings: '/settings',
  trackOrder: '/track-order',
  applyVendor: '/apply-vendor',
  googleCallback: '/auth/google/callback',
  vendorDashboard: '/dashboard/vendor',
  vendorSection: '/dashboard/vendor/:section',
  vendorProducts: '/dashboard/vendor/products',
  vendorOrders: '/dashboard/vendor/orders',
  vendorReturns: '/dashboard/vendor/returns',
  adminDashboard: '/dashboard/admin',
  adminUsers: '/dashboard/admin/users',
  adminProducts: '/dashboard/admin/products',
  adminOrders: '/dashboard/admin/orders',
  adminReturns: '/dashboard/admin/returns',
  adminReviews: '/dashboard/admin/reviews',
  adminSection: '/dashboard/admin/:section',
  tailorDashboard: '/dashboard/tailor',
  tailorSection: '/dashboard/tailor/:section',
  superAdminDashboard: '/dashboard/super-admin',
  superAdminSection: '/dashboard/super-admin/:section'
};

export const MAIN_NAV_LINKS = [
  { label: 'Home', path: ROUTE_PATHS.home },
  { label: 'Shop', path: ROUTE_PATHS.shop },
  { label: 'Tailoring', path: ROUTE_PATHS.tailoring },
  { label: 'About', path: ROUTE_PATHS.about },
  { label: 'Contact', path: ROUTE_PATHS.contact }
];

export const CUSTOMER_SHORTCUT_LINKS = [
  { label: 'Dashboard', path: ROUTE_PATHS.customerDashboard },
  { label: 'Orders', path: ROUTE_PATHS.orders },
  { label: 'Returns', path: ROUTE_PATHS.returns },
  { label: 'Reviews', path: ROUTE_PATHS.reviews },
  { label: 'Profile', path: ROUTE_PATHS.profile },
  { label: 'Settings', path: ROUTE_PATHS.settings }
];

export const VENDOR_NAV_ITEMS = [
  { label: 'Overview', to: ROUTE_PATHS.vendorDashboard, icon: 'bi-grid-1x2-fill' },
  { label: 'Shop Profile', to: '/dashboard/vendor/shop-profile', icon: 'bi-shop-window' },
  { label: 'Products', to: ROUTE_PATHS.vendorProducts, icon: 'bi-box-seam' },
  { label: 'Add Product', to: '/dashboard/vendor/add-product', icon: 'bi-plus-square' },
  { label: 'Orders', to: ROUTE_PATHS.vendorOrders, icon: 'bi-receipt-cutoff' },
  { label: 'Customized', to: '/dashboard/vendor/customized', icon: 'bi-scissors' },
  { label: 'Returns', to: ROUTE_PATHS.vendorReturns, icon: 'bi-arrow-counterclockwise' },
  { label: 'Reviews & Questions', to: '/dashboard/vendor/reviews-questions', icon: 'bi-chat-left-text' },
  { label: 'Messages', to: '/dashboard/vendor/messages', icon: 'bi-chat-dots' },
  { label: 'Payouts', to: '/dashboard/vendor/payouts', icon: 'bi-cash-stack' },
  { label: 'Settings', to: '/dashboard/vendor/settings', icon: 'bi-gear' }
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', to: ROUTE_PATHS.adminDashboard, icon: 'bi-grid-1x2-fill' },
  { label: 'Users', to: ROUTE_PATHS.adminUsers, icon: 'bi-people' },
  { label: 'Products', to: ROUTE_PATHS.adminProducts, icon: 'bi-box-seam' },
  { label: 'Vendor Applications', to: '/dashboard/admin/vendor-applications', icon: 'bi-patch-check' },
  { label: 'Tailor Applications', to: '/dashboard/admin/tailor-applications', icon: 'bi-clipboard-check' },
  { label: 'Vendors', to: '/dashboard/admin/vendors', icon: 'bi-shop' },
  { label: 'Tailors', to: '/dashboard/admin/tailors', icon: 'bi-scissors' },
  { label: 'Orders', to: ROUTE_PATHS.adminOrders, icon: 'bi-bag-check' },
  { label: 'Tailoring Requests', to: '/dashboard/admin/tailoring-requests', icon: 'bi-rulers' },
  { label: 'Returns', to: ROUTE_PATHS.adminReturns, icon: 'bi-arrow-counterclockwise' },
  { label: 'Reviews', to: ROUTE_PATHS.adminReviews, icon: 'bi-star' },
  { label: 'Reviews & Questions', to: '/dashboard/admin/reviews-questions', icon: 'bi-chat-left-text' },
  { label: 'Contact Messages', to: '/dashboard/admin/contact-messages', icon: 'bi-envelope' },
  { label: 'Vendor Support', to: '/dashboard/admin/vendor-support', icon: 'bi-headset' },
  { label: 'Analytics', to: '/dashboard/admin/analytics', icon: 'bi-bar-chart' },
  { label: 'Settings', to: '/dashboard/admin/settings', icon: 'bi-gear' }
];

export const TAILOR_NAV_ITEMS = [
  { label: 'Overview', to: ROUTE_PATHS.tailorDashboard, icon: 'bi-grid-1x2-fill' },
  { label: 'Assigned Requests', to: '/dashboard/tailor/assigned-requests', icon: 'bi-scissors' },
  { label: 'Measurements', to: '/dashboard/tailor/measurements', icon: 'bi-rulers' },
  { label: 'Messages', to: '/dashboard/tailor/messages', icon: 'bi-chat-dots' },
  { label: 'Progress Updates', to: '/dashboard/tailor/progress-updates', icon: 'bi-activity' },
  { label: 'Completed Work', to: '/dashboard/tailor/completed-work', icon: 'bi-check2-circle' },
  { label: 'Earnings', to: '/dashboard/tailor/earnings', icon: 'bi-cash-stack' },
  { label: 'Settings', to: '/dashboard/tailor/settings', icon: 'bi-gear' }
];

export function buildOrderDetailsPath(orderId) {
  return `/orders/${orderId}`;
}
