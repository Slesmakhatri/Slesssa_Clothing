import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function PromoSlider({ slides = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!slides.length) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [slides]);

  if (!slides.length) {
    return null;
  }

  const slide = slides[activeIndex];

  return (
    <section className="promo-slider-wrap">
      <div className="container">
        <div className="promo-slider">
          <div>
            <span className="section-eyebrow">{slide.accent}</span>
            <h3>{slide.title}</h3>
            <p>{slide.text}</p>
          </div>
          <Link to={slide.link} className="btn btn-slessaa btn-slessaa-primary">
            Explore
          </Link>
        </div>
      </div>
    </section>
  );
}

export default PromoSlider;
