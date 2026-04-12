import { Link } from 'react-router-dom';
import { footerLinks } from '../../data/storefront';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand-column">
            <span className="section-eyebrow">Slessaa Clothing</span>
            <h3>Original premium ecommerce for a Nepal-focused wardrobe.</h3>
            <p>
              Built around stable product identity, category-accurate imagery, clean navigation, and a calmer shopping
              rhythm from discovery to cart.
            </p>
          </div>

          <div className="footer-newsletter">
            <h5>Join the Slessaa edit</h5>
            <div className="newsletter-inline">
              <input type="email" className="form-control premium-input" placeholder="Email address" />
              <button className="btn btn-slessaa btn-slessaa-primary">Subscribe</button>
            </div>
          </div>
        </div>

        <div className="row g-4 footer-links-row">
          <div className="col-md-4">
            <h6>Shop</h6>
            {footerLinks.quick.map((item) => (
              <Link key={item.label} to={item.to} className="footer-link">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="col-md-4">
            <h6>Support</h6>
            {footerLinks.support.map((item) => (
              <Link key={item.label} to={item.to} className="footer-link">
                {item.label}
              </Link>
            ))}
            <Link to="/apply-vendor" className="footer-link">Apply as Vendor</Link>
          </div>
          <div className="col-md-4">
            <h6>Visit</h6>
            <span className="footer-link">Lazimpat, Kathmandu</span>
            <span className="footer-link">+977 9800000000</span>
            <span className="footer-link">hello@slessaa.com</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{'\u00A9'} 2026 Slessaa Clothing</span>
          <div className="footer-bottom-links">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/apply-vendor">Apply as Vendor</Link>
            <Link to="/checkout">Payments</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
