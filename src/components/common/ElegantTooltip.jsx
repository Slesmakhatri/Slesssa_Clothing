function ElegantTooltip({ label, children }) {
  return (
    <span className="elegant-tooltip">
      {children}
      <span className="elegant-tooltip-bubble">{label}</span>
    </span>
  );
}

export default ElegantTooltip;
