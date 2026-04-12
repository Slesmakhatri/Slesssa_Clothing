import ButtonLink from '../common/ButtonLink';

function HeroSection() {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <span className="section-eyebrow">Nepal-based premium tailoring</span>
            <h1>Custom Clothing, Tailored for You</h1>
            <p>
              Discover modern fashion shopping with made-to-measure tailoring, AI-led styling ideas,
              and trusted local checkout flows designed for Nepal.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <ButtonLink to="/shop" variant="primary">
                Shop Now
              </ButtonLink>
              <ButtonLink to="/tailoring" variant="outline">
                Customize Your Outfit
              </ButtonLink>
            </div>
            <div className="hero-metrics">
              <div>
                <strong>3,200+</strong>
                <span>Tailored orders delivered</span>
              </div>
              <div>
                <strong>24 hrs</strong>
                <span>Design consultation response</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Customer satisfaction</span>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="hero-media">
              <img
                src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80"
                alt="Premium Slessaa fashion"
              />
              <div className="floating-card">
                <span>AI Style Match</span>
                <strong>Minimal Luxe Edit</strong>
                <p>Recommended for spring events, city dinners, and custom tailoring requests.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
