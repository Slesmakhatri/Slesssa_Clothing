function formatLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function AnalyticsBarList({ items = [], labelKey = 'label', valueKey = 'value', title, emptyText = 'No analytics data yet.' }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 0);

  return (
    <div className="analytics-card">
      {title ? <h4>{title}</h4> : null}
      {items.length ? (
        <div className="analytics-bar-list">
          {items.map((item) => {
            const value = Number(item[valueKey] || 0);
            const width = maxValue > 0 ? `${Math.max(12, (value / maxValue) * 100)}%` : '12%';
            return (
              <div key={`${item[labelKey]}-${value}`} className="analytics-bar-item">
                <div className="analytics-bar-labels">
                  <span>{formatLabel(item[labelKey])}</span>
                  <strong>{value.toLocaleString()}</strong>
                </div>
                <div className="analytics-bar-track">
                  <div className="analytics-bar-fill" style={{ width }}></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="filter-empty-state compact">
          <p>{emptyText}</p>
        </div>
      )}
    </div>
  );
}

export default AnalyticsBarList;
