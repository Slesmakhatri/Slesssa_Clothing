import RoleWorkspaceLayout from './RoleWorkspaceLayout';

const tailorNavItems = [
  { label: 'Overview', to: '/dashboard/tailor', icon: 'bi-grid-1x2-fill' },
  { label: 'Assigned Requests', to: '/dashboard/tailor/assigned-requests', icon: 'bi-scissors' },
  { label: 'Measurements', to: '/dashboard/tailor/measurements', icon: 'bi-rulers' },
  { label: 'Messages', to: '/dashboard/tailor/messages', icon: 'bi-chat-dots' },
  { label: 'Progress Updates', to: '/dashboard/tailor/progress-updates', icon: 'bi-activity' },
  { label: 'Completed Work', to: '/dashboard/tailor/completed-work', icon: 'bi-check2-circle' },
  { label: 'Earnings', to: '/dashboard/tailor/earnings', icon: 'bi-cash-stack' },
  { label: 'Settings', to: '/dashboard/tailor/settings', icon: 'bi-gear' }
];

function TailorLayout() {
  return (
    <RoleWorkspaceLayout
      role="tailor"
      title="Tailor Dashboard"
      description="Focus on assigned tailoring work, customer measurements, status updates, and direct production communication."
      navItems={tailorNavItems}
    />
  );
}

export default TailorLayout;
