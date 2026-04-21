import RoleWorkspaceLayout from './RoleWorkspaceLayout';
import { TAILOR_NAV_ITEMS } from '../../routes/config';

function TailorLayout() {
  return (
    <RoleWorkspaceLayout
      role="tailor"
      title="Tailor Dashboard"
      description="Focus on assigned tailoring work, customer measurements, status updates, and direct production communication."
      navItems={TAILOR_NAV_ITEMS}
    />
  );
}

export default TailorLayout;
