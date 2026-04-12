function NewsletterBox() {
  return (
    <section className="newsletter-box">
      <div className="container">
        <div className="newsletter-panel">
          <div>
            <span className="section-eyebrow">Private Access</span>
            <h3>Get early access to new drops and tailoring offers</h3>
            <p>Sign up for premium style notes, seasonal edits, and launch-day offers.</p>
          </div>
          <div className="newsletter-inline">
            <input className="form-control premium-input" type="email" placeholder="Enter your email" />
            <button className="btn btn-slessaa btn-slessaa-primary">Join Now</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NewsletterBox;
