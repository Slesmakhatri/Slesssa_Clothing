function formatNumber(value, type = 'count') {
  if (type === 'currency') {
    return `NPR ${Number(value || 0).toLocaleString()}`;
  }
  if (type === 'percent') {
    return `${Number(value || 0).toLocaleString()}%`;
  }
  return Number(value || 0).toLocaleString();
}

function AnalyticsTableCard({ title, columns = [], rows = [], emptyText = 'No records yet.' }) {
  return (
    <div className="table-card analytics-table-card">
      <h4>{title}</h4>
      {rows.length ? (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(row)
                        : formatNumber(row[column.key], column.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="filter-empty-state compact">
          <p>{emptyText}</p>
        </div>
      )}
    </div>
  );
}

export default AnalyticsTableCard;
