function DashboardStatCard({ stat }) {
  return (
    <article className="dashboard-stat-card">
      <div className="icon-circle icon-circle-lg">
        <i className={`bi ${stat.icon}`}></i>
      </div>
      <div>
        <span>{stat.label}</span>
        <h4>{stat.value}</h4>
      </div>
    </article>
  );
}

export default DashboardStatCard;
