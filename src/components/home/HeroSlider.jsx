import { useEffect, useState } from 'react';
import ButtonLink from '../common/ButtonLink';

function renderHeroTitle(title) {
  const words = title.split(' ');
  if (words.length < 3) {
    return title;
  }

  return (
    <>
      {words.slice(0, -2).join(' ')}
      <span className="hero-title-accent"> {words.slice(-2).join(' ')}</span>
    </>
  );
}

function HeroSlider({ slides = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!slides.length) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides]);

  if (!slides.length) {
    return null;
  }

  const activeSlide = slides[activeIndex];

  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-shell">
          <div className="hero-copy-panel">
            <div className="hero-copy slide-in-up">
              <span className="section-eyebrow">{activeSlide.eyebrow}</span>
              <h1>{renderHeroTitle(activeSlide.title)}</h1>
              <p>{activeSlide.text}</p>
              <div className="hero-actions">
                <ButtonLink to={activeSlide.ctaPrimary.to} variant="primary">
                  {activeSlide.ctaPrimary.label}
                </ButtonLink>
                <ButtonLink to={activeSlide.ctaSecondary.to} variant="outline">
                  {activeSlide.ctaSecondary.label}
                </ButtonLink>
              </div>
              <div className="hero-metrics">
                <div>
                  <strong>3,200+</strong>
                  <span>Tailored orders delivered</span>
                </div>
                <div>
                  <strong>24 hrs</strong>
                  <span>Consultation turnaround</span>
                </div>
                <div>
                  <strong>4.9/5</strong>
                  <span>Client satisfaction</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-media-panel">
            <div className="hero-media hero-slider-media">
              <img key={activeSlide.id} src={activeSlide.image} alt={activeSlide.title} className="hero-slide-image" />
              <div className="floating-card">
                <span className="floating-card-label">Current Edit Tailoring</span>
                <strong className="floating-card-title">{activeSlide.title}</strong>
                <p className="floating-card-copy">{activeSlide.text}</p>
              </div>
              <div className="hero-orb hero-orb-one"></div>
              <div className="hero-orb hero-orb-two"></div>
            </div>
            <div className="hero-slider-dots">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  className={`hero-dot ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSlider;
