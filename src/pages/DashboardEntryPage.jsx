import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/roleRouting';

function DashboardEntryPage() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return (
      <section className="section-space">
        <div className="container">
          <div className="table-card vendor-dashboard-loading">
            <div className="spinner-border text-dark" role="status" aria-hidden="true"></div>
            <p>Opening dashboard...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPath(user)} replace />;
}

export default DashboardEntryPage;
