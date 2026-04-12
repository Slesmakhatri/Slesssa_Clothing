import { Link } from 'react-router-dom';

function VendorCard({ vendor }) {
  return (
    <article className="vendor-card reveal-up">
      <img src={vendor.image} alt={vendor.brand_name} className="vendor-card-media" />
      <div className="vendor-card-body">
        <span className="vendor-specialty">{vendor.specialty}</span>
        <h4>{vendor.brand_name}</h4>
        <p>{vendor.description}</p>
        <div className="vendor-card-meta">
          <span>
            <i className="bi bi-star-fill"></i> {vendor.rating}
          </span>
          <span>{vendor.product_count} products</span>
        </div>
        <Link to="/shop" className="btn btn-slessaa btn-slessaa-outline btn-sm">
          Shop Vendor
        </Link>
      </div>
    </article>
  );
}

export default VendorCard;
