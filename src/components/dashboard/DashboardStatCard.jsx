import { Link } from 'react-router-dom';
import SlessaaCard from '../common/SlessaaCard';

function DashboardStatCard({ stat }) {
  const content = (
    <>
      <div className="icon-circle icon-circle-lg ecommerce-dashboard-card__icon">
        <i className={`bi ${stat.icon}`}></i>
      </div>
      <div className="ecommerce-dashboard-card__copy">
        <span>{stat.label}</span>
        <h4>{stat.value}</h4>
      </div>
    </>
  );

  if (stat.to) {
    return (
      <SlessaaCard
        as={Link}
        to={stat.to}
        className="dashboard-stat-card ecommerce-dashboard-card dashboard-stat-card-link"
        aria-label={`Open ${stat.label}`}
      >
        {content}
      </SlessaaCard>
    );
  }

  return (
    <SlessaaCard as="article" className="dashboard-stat-card ecommerce-dashboard-card">
      {content}
    </SlessaaCard>
  );
}

export default DashboardStatCard;
