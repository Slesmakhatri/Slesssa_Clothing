import { ROUTE_PATHS } from '../routes/config';

export const ROLE_DASHBOARD_PATHS = {
  super_admin: ROUTE_PATHS.superAdminDashboard,
  admin: ROUTE_PATHS.adminDashboard,
  vendor: ROUTE_PATHS.vendorDashboard,
  tailor: ROUTE_PATHS.tailorDashboard,
  customer: ROUTE_PATHS.customerDashboard
};

export function getDashboardPath(userOrRole) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return ROLE_DASHBOARD_PATHS[role] || ROLE_DASHBOARD_PATHS.customer;
}

export function isOperationalRole(role) {
  return ['vendor', 'tailor', 'admin', 'super_admin'].includes(String(role || '').toLowerCase());
}
