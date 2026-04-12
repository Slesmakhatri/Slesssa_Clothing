export const ROLE_DASHBOARD_PATHS = {
  super_admin: '/dashboard/super-admin',
  admin: '/dashboard/admin',
  vendor: '/dashboard/vendor',
  tailor: '/dashboard/tailor',
  customer: '/dashboard/customer'
};

export function getDashboardPath(userOrRole) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return ROLE_DASHBOARD_PATHS[role] || ROLE_DASHBOARD_PATHS.customer;
}

export function isOperationalRole(role) {
  return ['vendor', 'tailor', 'admin', 'super_admin'].includes(String(role || '').toLowerCase());
}
