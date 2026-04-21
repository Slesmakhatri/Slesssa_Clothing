import { Link } from 'react-router-dom';

function PlaceholderPage({ eyebrow = 'Coming Soon', title, description, primaryLink, secondaryLink }) {
  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="table-card d-flex flex-column gap-3 align-items-start">
            <p className="mb-0">{description}</p>
            <div className="d-flex flex-wrap gap-3">
              {primaryLink ? (
                <Link to={primaryLink.to} className="btn btn-slessaa btn-slessaa-primary">
                  {primaryLink.label}
                </Link>
              ) : null}
              {secondaryLink ? (
                <Link to={secondaryLink.to} className="btn btn-slessaa btn-slessaa-outline">
                  {secondaryLink.label}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default PlaceholderPage;
