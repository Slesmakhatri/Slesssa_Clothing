import { useEffect, useState } from 'react';
import TestimonialCard from './TestimonialCard';

function TestimonialSlider({ items = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!items.length) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [items]);

  if (!items.length) {
    return null;
  }

  return (
    <div className="testimonial-slider">
      <div className="testimonial-slider-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {items.map((item) => (
          <div key={item.id} className="testimonial-slide">
            <TestimonialCard item={item} />
          </div>
        ))}
      </div>
      <div className="hero-slider-dots justify-content-center mt-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`hero-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show testimonial ${index + 1}`}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default TestimonialSlider;
