import RoleWorkspaceLayout from './RoleWorkspaceLayout';

const vendorNavItems = [
  { label: 'Overview', to: '/dashboard/vendor', icon: 'bi-grid-1x2-fill' },
  { label: 'Shop Profile', to: '/dashboard/vendor/shop-profile', icon: 'bi-shop-window' },
  { label: 'Products', to: '/dashboard/vendor/products', icon: 'bi-box-seam' },
  { label: 'Add Product', to: '/dashboard/vendor/add-product', icon: 'bi-plus-square' },
  { label: 'Orders', to: '/dashboard/vendor/orders', icon: 'bi-receipt-cutoff' },
  { label: 'Customized', to: '/dashboard/vendor/customized', icon: 'bi-scissors' },
  { label: 'Returns', to: '/dashboard/vendor/returns', icon: 'bi-arrow-counterclockwise' },
  { label: 'Reviews & Questions', to: '/dashboard/vendor/reviews-questions', icon: 'bi-chat-left-text' },
  { label: 'Messages', to: '/dashboard/vendor/messages', icon: 'bi-chat-dots' },
  { label: 'Payouts', to: '/dashboard/vendor/payouts', icon: 'bi-cash-stack' },
  { label: 'Settings', to: '/dashboard/vendor/settings', icon: 'bi-gear' }
];

function VendorLayout() {
  return (
    <RoleWorkspaceLayout
      role="vendor"
      title="Vendor Dashboard"
      description="Manage your shop profile, products, routed orders, customer issues, and payout visibility without storefront shopping controls."
      navItems={vendorNavItems}
    />
  );
}

export default VendorLayout;
