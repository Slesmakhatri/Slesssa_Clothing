import SlessaaCard from '../common/SlessaaCard';

function DashboardStatCard({ stat }) {
  return (
    <SlessaaCard as="article" className="dashboard-stat-card ecommerce-dashboard-card">
      <div className="icon-circle icon-circle-lg ecommerce-dashboard-card__icon">
        <i className={`bi ${stat.icon}`}></i>
      </div>
      <div className="ecommerce-dashboard-card__copy">
        <span>{stat.label}</span>
        <h4>{stat.value}</h4>
      </div>
    </SlessaaCard>
  );
}

export default DashboardStatCard;
