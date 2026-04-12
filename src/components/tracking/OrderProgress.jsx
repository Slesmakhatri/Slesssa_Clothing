function OrderProgress({ steps }) {
  return (
    <div className="order-progress-card">
      <div className="progress-line"></div>
      {steps.map((step) => (
        <div key={step.label} className={`progress-step ${step.completed ? 'completed' : ''}`}>
          <div className="progress-dot"></div>
          <h6>{step.label}</h6>
          <span>{step.date}</span>
        </div>
      ))}
    </div>
  );
}

export default OrderProgress;
