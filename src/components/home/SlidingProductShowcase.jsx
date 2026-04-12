import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../shop/ProductCard';

function SlidingProductShowcase({ items = [], title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = useMemo(() => {
    if (items.length <= 4) {
      return [items];
    }

    const grouped = [];
    for (let index = 0; index < items.length; index += 4) {
      grouped.push(items.slice(index, index + 4));
    }
    return grouped;
  }, [items]);

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

  return (
    <div className="sliding-showcase">
      {title && <h3 className="showcase-title">{title}</h3>}
      <div className="showcase-viewport">
        <div className="showcase-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {slides.map((group, index) => (
            <div key={index} className="showcase-slide">
              <div className="showcase-grid">
                {group.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hero-slider-dots justify-content-center mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`hero-dot ${index === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show product slide ${index + 1}`}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default SlidingProductShowcase;
