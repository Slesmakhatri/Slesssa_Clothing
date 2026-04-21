import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../utils/roleRouting';

function NotAuthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const fallbackPath = isAuthenticated ? getDashboardPath(user) : '/login';

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Access Restricted</span>
          <h1>You do not have permission to open that page.</h1>
          <p>Use the correct workspace for your account role or sign in with an account that has access.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="table-card d-flex flex-column gap-3 align-items-start">
            <p className="mb-0">The route exists, but your current account is not allowed to use it.</p>
            <div className="d-flex flex-wrap gap-3">
              <Link to={fallbackPath} className="btn btn-slessaa btn-slessaa-primary">
                {isAuthenticated ? 'Open My Dashboard' : 'Go to Login'}
              </Link>
              <Link to="/" className="btn btn-slessaa btn-slessaa-outline">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default NotAuthorizedPage;
