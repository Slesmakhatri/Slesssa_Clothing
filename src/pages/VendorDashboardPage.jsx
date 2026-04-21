import { useParams } from 'react-router-dom';
import VendorDashboardWorkspace from '../components/vendor/VendorDashboardWorkspace';

const VENDOR_SECTION_BY_ROUTE = {
  'shop-profile': 'shop',
  products: 'products',
  'add-product': 'add-product',
  orders: 'orders',
  customized: 'customized',
  returns: 'returns',
  'reviews-questions': 'reviews',
  messages: 'messages',
  support: 'messages',
  payouts: 'payouts',
  settings: 'settings'
};

function VendorDashboardPage() {
  const { section } = useParams();
  const initialSection = VENDOR_SECTION_BY_ROUTE[section] || 'dashboard';
  const initialMessageMode = section === 'support' ? 'admin' : 'customers';

  return (
    <VendorDashboardWorkspace
      initialSection={initialSection}
      initialMessageMode={initialMessageMode}
      showInternalNav={false}
      showWorkspaceHeader={false}
    />
  );
}

export default VendorDashboardPage;
