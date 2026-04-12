import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import SectionTitle from '../components/common/SectionTitle';
import { dashboardData } from '../data/mockData';

function DashboardsPage() {
  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Dashboard Preview</span>
          <h1>Role-based views for customers, tailors, and admins</h1>
          <p>Preview how Slessaa can scale into an operational platform without redesigning the frontend.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="dashboard-panel mb-5">
            <SectionTitle eyebrow="Customer Dashboard" title="Shopping and order visibility" align="start" />
            <div className="row g-4 mb-4">
              {dashboardData.customer.stats.map((stat) => (
                <div key={stat.label} className="col-md-4">
                  <DashboardStatCard stat={stat} />
                </div>
              ))}
            </div>
            <div className="table-card">
              <table className="table align-middle mb-0">
                <thead>
                  <tr><th>Order</th><th>Item</th><th>Status</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {dashboardData.customer.orders.map((item) => (
                    <tr key={item.order}>
                      <td>{item.order}</td><td>{item.item}</td><td>{item.status}</td><td>{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-panel mb-5">
            <SectionTitle eyebrow="Tailor Dashboard" title="Production-focused workflow preview" align="start" />
            <div className="row g-4 mb-4">
              {dashboardData.tailor.stats.map((stat) => (
                <div key={stat.label} className="col-md-4">
                  <DashboardStatCard stat={stat} />
                </div>
              ))}
            </div>
            <div className="row g-4">
              {dashboardData.tailor.tasks.map((task) => (
                <div key={task.title} className="col-md-6">
                  <article className="task-card">
                    <h5>{task.title}</h5>
                    <p>{task.due}</p>
                    <span className="chip">{task.priority} Priority</span>
                  </article>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-panel">
            <SectionTitle eyebrow="Admin Dashboard" title="Business overview with management previews" align="start" />
            <div className="row g-4 mb-4">
              {dashboardData.admin.stats.map((stat) => (
                <div key={stat.label} className="col-md-4">
                  <DashboardStatCard stat={stat} />
                </div>
              ))}
            </div>
            <div className="row g-4">
              <div className="col-lg-7">
                <div className="chart-placeholder">
                  <h5>Sales Overview</h5>
                  <div className="chart-bars">
                    {[55, 72, 64, 88, 74, 95, 80].map((value) => (
                      <span key={value} style={{ height: `${value}%` }}></span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="table-card">
                  <h5 className="mb-3">Recent Transactions</h5>
                  {dashboardData.admin.transactions.map((item) => (
                    <div key={item.id} className="transaction-row">
                      <div>
                        <strong>{item.customer}</strong>
                        <span>{item.id} • {item.method}</span>
                      </div>
                      <strong>{item.amount}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default DashboardsPage;
