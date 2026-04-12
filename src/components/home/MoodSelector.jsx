import { useMemo, useState } from 'react';
import ElegantTooltip from '../common/ElegantTooltip';

const moodOptions = [
  { id: 'elegant', label: 'Elegant', icon: 'bi-gem', hint: 'Soft glamour and elevated tailoring' },
  { id: 'casual', label: 'Casual', icon: 'bi-sun', hint: 'Relaxed silhouettes with polish' },
  { id: 'traditional', label: 'Traditional', icon: 'bi-flower1', hint: 'Nepal-inspired heritage details' },
  { id: 'party', label: 'Party', icon: 'bi-stars', hint: 'Statement looks for events and evenings' },
  { id: 'formal', label: 'Formal', icon: 'bi-briefcase', hint: 'Sharp lines for work and occasions' },
  { id: 'minimal', label: 'Minimal', icon: 'bi-circle-square', hint: 'Clean shapes and quiet luxury' }
];

function MoodSelector({ products = [], recommendations = [] }) {
  const [activeMood, setActiveMood] = useState(moodOptions[0].id);

  const curatedItems = useMemo(() => {
    const toneMap = {
      elegant: ['Premium', 'Editor Pick', 'Best Seller'],
      casual: ['New', 'Best Seller'],
      traditional: ['New'],
      party: ['Sale', 'Editor Pick'],
      formal: ['Premium', 'Best Seller'],
      minimal: ['Premium', 'New']
    };

    const badges = toneMap[activeMood] || [];
    return products.filter((item) => badges.includes(item.badge)).slice(0, 3);
  }, [activeMood, products]);

  const activeRecommendation = useMemo(() => {
    const map = { elegant: 0, casual: 1, traditional: 2, party: 0, formal: 1, minimal: 2 };
    return recommendations[map[activeMood] ?? 0];
  }, [activeMood, recommendations]);

  return (
    <section className="section-space mood-section">
      <div className="container">
        <div className="row g-4 align-items-center">
          <div className="col-lg-5">
            <span className="section-eyebrow">Mood Selection</span>
            <h2 className="mood-title">
              Dress by feeling, <span className="display-script">styled by mood</span>
            </h2>
            <p className="mood-copy">
              Select the energy you want to wear today. The interface responds visually to each mood and previews matching fashion directions.
            </p>
            <div className="mood-chip-grid">
              {moodOptions.map((mood) => (
                <ElegantTooltip key={mood.id} label={mood.hint}>
                  <button
                    type="button"
                    className={`mood-chip ${activeMood === mood.id ? 'active' : ''}`}
                    onClick={() => setActiveMood(mood.id)}
                  >
                    <i className={`bi ${mood.icon}`}></i>
                    <span>{mood.label}</span>
                  </button>
                </ElegantTooltip>
              ))}
            </div>
          </div>
          <div className="col-lg-7">
            <div className="mood-preview-panel">
              <div className="mood-preview-card mood-preview-feature">
                <span className="section-eyebrow">Mood Recommendation</span>
                <h3>{activeRecommendation?.title || 'Curated Fashion Direction'}</h3>
                <p>{activeRecommendation?.text || 'A premium edit will appear here based on the selected mood.'}</p>
                <div className="mood-values">
                  <span className="value-pill">{activeRecommendation?.match || 'Mood matched'}</span>
                  <span className="value-pill">{activeMood}</span>
                </div>
              </div>
              <div className="mood-preview-grid">
                {curatedItems.map((item, index) => (
                  <article key={item.id} className="mood-mini-card" style={{ animationDelay: `${index * 120}ms` }}>
                    <img src={item.image} alt={item.title} />
                    <div>
                      <small>{item.badge}</small>
                      <h5>{item.title}</h5>
                      <p>NPR {item.price.toLocaleString()}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MoodSelector;
