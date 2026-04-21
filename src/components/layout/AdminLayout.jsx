import RoleWorkspaceLayout from './RoleWorkspaceLayout';
import { ADMIN_NAV_ITEMS } from '../../routes/config';

function AdminLayout() {
  return (
    <RoleWorkspaceLayout
      role="admin"
      title="Admin Panel"
      description="Run platform operations, approvals, order oversight, return handling, and payout management without storefront browsing UI."
      navItems={ADMIN_NAV_ITEMS}
    />
  );
}

export default AdminLayout;
