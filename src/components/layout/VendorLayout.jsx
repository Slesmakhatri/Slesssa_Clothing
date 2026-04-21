import RoleWorkspaceLayout from './RoleWorkspaceLayout';
import { VENDOR_NAV_ITEMS } from '../../routes/config';

function VendorLayout() {
  return (
    <RoleWorkspaceLayout
      role="vendor"
      title="Vendor Dashboard"
      description="Manage your shop profile, products, routed orders, customer issues, and payout visibility without storefront shopping controls."
      navItems={VENDOR_NAV_ITEMS}
    />
  );
}

export default VendorLayout;
