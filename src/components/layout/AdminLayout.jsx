import RoleWorkspaceLayout from './RoleWorkspaceLayout';

const adminNavItems = [
  { label: 'Overview', to: '/dashboard/admin', icon: 'bi-grid-1x2-fill' },
  { label: 'Users', to: '/dashboard/admin/users', icon: 'bi-people' },
  { label: 'Vendor Applications', to: '/dashboard/admin/vendor-applications', icon: 'bi-patch-check' },
  { label: 'Tailor Applications', to: '/dashboard/admin/tailor-applications', icon: 'bi-clipboard-check' },
  { label: 'Vendors', to: '/dashboard/admin/vendors', icon: 'bi-shop' },
  { label: 'Tailors', to: '/dashboard/admin/tailors', icon: 'bi-scissors' },
  { label: 'Orders', to: '/dashboard/admin/orders', icon: 'bi-bag-check' },
  { label: 'Tailoring Requests', to: '/dashboard/admin/tailoring-requests', icon: 'bi-rulers' },
  { label: 'Returns', to: '/dashboard/admin/returns', icon: 'bi-arrow-counterclockwise' },
  { label: 'Payouts', to: '/dashboard/admin/payouts', icon: 'bi-cash-stack' },
  { label: 'Reviews & Questions', to: '/dashboard/admin/reviews-questions', icon: 'bi-chat-left-text' },
  { label: 'Contact Messages', to: '/dashboard/admin/contact-messages', icon: 'bi-envelope' },
  { label: 'Vendor Support', to: '/dashboard/admin/vendor-support', icon: 'bi-headset' },
  { label: 'Analytics', to: '/dashboard/admin/analytics', icon: 'bi-bar-chart' },
  { label: 'Settings', to: '/dashboard/admin/settings', icon: 'bi-gear' }
];

function AdminLayout() {
  return (
    <RoleWorkspaceLayout
      role="admin"
      title="Admin Panel"
      description="Run platform operations, approvals, order oversight, return handling, and payout management without storefront browsing UI."
      navItems={adminNavItems}
    />
  );
}

export default AdminLayout;
