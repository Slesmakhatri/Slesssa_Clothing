import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Page Not Found</span>
          <h1>The page you requested does not exist.</h1>
          <p>Use one of the connected navigation routes below instead of a stale or invalid URL.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="table-card d-flex flex-column gap-3 align-items-start">
            <div className="d-flex flex-wrap gap-3">
              <Link to="/" className="btn btn-slessaa btn-slessaa-primary">Home</Link>
              <Link to="/shop" className="btn btn-slessaa btn-slessaa-outline">Products</Link>
              <Link to="/dashboard" className="btn btn-slessaa btn-slessaa-outline">Dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default NotFoundPage;
