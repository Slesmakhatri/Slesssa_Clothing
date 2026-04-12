import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRouting';

function isNavItemActive(item, location) {
  if (!item?.to) return false;
  const [pathname, hash = ''] = item.to.split('#');
  if (location.pathname !== pathname) return false;
  if (!hash) return location.hash === '' || item.exact === false;
  return location.hash === `#${hash}`;
}

function formatRole(value) {
  return String(value || '').replace(/^\w/, (letter) => letter.toUpperCase());
}

function RoleWorkspaceLayout({ role, title, description, navItems = [] }) {
  const location = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <section className="section-space">
        <div className="container">
          <div className="table-card vendor-dashboard-loading">
            <div className="spinner-border text-dark" role="status" aria-hidden="true"></div>
            <p>Opening workspace...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return (
    <div className={`role-workspace role-workspace-${role || 'default'}`}>
      <aside className="role-workspace-sidebar table-card">
        <div className="role-workspace-brand">
          <span className="section-eyebrow">{title}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <nav className="role-workspace-nav" aria-label={`${title} navigation`}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`role-workspace-nav__item ${isNavItemActive(item, location) ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="role-workspace-sidebar__footer">
          <Link to={getDashboardPath(user)} className="btn btn-slessaa btn-slessaa-outline">
            Open Overview
          </Link>
          <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="role-workspace-main">
        <header className="role-workspace-topbar table-card">
          <div>
            <span className="section-eyebrow">Signed In</span>
            <h2>{user?.full_name || user?.email}</h2>
            <p>{formatRole(user?.role)} workspace</p>
          </div>
          <div className="role-workspace-topbar__actions"></div>
        </header>

        <main className="role-workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RoleWorkspaceLayout;
