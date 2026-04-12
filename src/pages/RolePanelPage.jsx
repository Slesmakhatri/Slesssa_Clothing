import { Link } from 'react-router-dom';

const roleCopy = {
  vendor: {
    eyebrow: 'Vendor Dashboard',
    fallbackPath: '/dashboard/vendor',
    fallbackLabel: 'Back to Vendor Dashboard'
  },
  tailor: {
    eyebrow: 'Tailor Dashboard',
    fallbackPath: '/dashboard/tailor',
    fallbackLabel: 'Back to Tailor Dashboard'
  },
  admin: {
    eyebrow: 'Admin Panel',
    fallbackPath: '/dashboard/admin',
    fallbackLabel: 'Back to Admin Panel'
  }
};

function RolePanelPage({ role, title, description, cards = [] }) {
  const copy = roleCopy[role] || roleCopy.vendor;

  return (
    <section className="role-module-page">
      <div className="table-card role-module-hero">
        <span className="section-eyebrow">{copy.eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link to={copy.fallbackPath} className="btn btn-slessaa btn-slessaa-outline">
          {copy.fallbackLabel}
        </Link>
      </div>

      {cards.length ? (
        <div className="role-module-grid">
          {cards.map((card) => (
            <article key={card.title} className="table-card role-module-card">
              <i className={`bi ${card.icon || 'bi-grid-1x2'}`}></i>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default RolePanelPage;
