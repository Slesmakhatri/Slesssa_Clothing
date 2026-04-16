import { Link } from 'react-router-dom';
import { footerLinks } from '../../data/storefront';

function FooterLink({ item }) {
  function handleClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <Link to={item.to} className="footer-link footer-nav-link" onClick={handleClick} aria-label={`Open ${item.label}`}>
      {item.label}
    </Link>
  );
}

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
              <FooterLink key={item.label} item={item} />
            ))}
          </div>
          <div className="col-md-4">
            <h6>Support</h6>
            {footerLinks.support.map((item) => (
              <FooterLink key={item.label} item={item} />
            ))}
          </div>
          <div className="col-md-4">
            <h6>Visit</h6>
            <span className="footer-link footer-contact-line">Lazimpat, Kathmandu</span>
            <a className="footer-link footer-nav-link" href="tel:+9779800000000">+977 9800000000</a>
            <a className="footer-link footer-nav-link" href="mailto:hello@slessaa.com">hello@slessaa.com</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{'\u00A9'} 2026 Slessaa Clothing</span>
          <div className="footer-bottom-links">
            <Link to="/about" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>About</Link>
            <Link to="/contact" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Contact</Link>
            <Link to="/apply-vendor" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Apply as Vendor</Link>
            <Link to="/checkout" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Payments</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
