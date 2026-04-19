import RoleWorkspaceLayout from './RoleWorkspaceLayout';

const superAdminNavItems = [
  { label: 'Dashboard', to: '/dashboard/super-admin', icon: 'bi-grid-1x2-fill' },
  { label: 'Users', to: '/dashboard/super-admin/users', icon: 'bi-people' },
  { label: 'Admins', to: '/dashboard/super-admin/admins', icon: 'bi-person-gear' },
  { label: 'Vendors', to: '/dashboard/super-admin/vendors', icon: 'bi-shop' },
  { label: 'Tailors', to: '/dashboard/super-admin/tailors', icon: 'bi-scissors' },
  { label: 'Orders', to: '/dashboard/super-admin/orders', icon: 'bi-bag-check' },
  { label: 'Returns', to: '/dashboard/super-admin/returns', icon: 'bi-arrow-counterclockwise' },
  { label: 'Commission', to: '/dashboard/super-admin/commission', icon: 'bi-cash-stack' },
  { label: 'Analytics', to: '/dashboard/super-admin/analytics', icon: 'bi-bar-chart' },
  { label: 'Settings', to: '/dashboard/super-admin/settings', icon: 'bi-gear' }
];

function SuperAdminLayout() {
  return (
    <RoleWorkspaceLayout
      role="super_admin"
      title="Super Admin"
      description="Full system control for users, admins, vendors, tailors, orders, payouts, commissions, and platform settings."
      navItems={superAdminNavItems}
    />
  );
}

export default SuperAdminLayout;
