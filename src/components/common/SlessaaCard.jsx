function SlessaaCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`slessaa-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export default SlessaaCard;
