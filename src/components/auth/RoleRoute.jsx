import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRouting';

function RoleRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <section className="section-space">
        <div className="container">
          <div className="table-card vendor-dashboard-loading">
            <div className="spinner-border text-dark" role="status" aria-hidden="true"></div>
            <p>Checking access...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/not-authorized" replace state={{ from: location.pathname, fallback: getDashboardPath(user) }} />;
  }

  return children;
}

export default RoleRoute;
