import { Link } from 'react-router-dom';

function ButtonLink({ to, children, variant = 'primary', className = '' }) {
  return (
    <Link to={to} className={`btn btn-slessaa btn-slessaa-${variant} ${className}`}>
      {children}
    </Link>
  );
}

export default ButtonLink;
