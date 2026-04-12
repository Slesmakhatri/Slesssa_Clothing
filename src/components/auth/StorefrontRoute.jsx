import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPath } from '../../utils/roleRouting';

function StorefrontRoute({ children }) {
  const location = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <section className="section-space">
        <div className="container">
          <div className="table-card vendor-dashboard-loading">
            <div className="spinner-border text-dark" role="status" aria-hidden="true"></div>
            <p>Loading your workspace...</p>
          </div>
        </div>
      </section>
    );
  }

  if (isAuthenticated && user?.role && user.role !== 'customer') {
    return <Navigate to={getDashboardPath(user)} replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default StorefrontRoute;
