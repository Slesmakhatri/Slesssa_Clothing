import RevealSection from '../common/RevealSection';
import SectionTitle from '../common/SectionTitle';

function AiRecommendationPreview({ items }) {
  return (
    <RevealSection className="section-space home-ai-section">
      <div className="container">
        <div className="row g-3 align-items-start home-ai-row">
          <div className="col-lg-5 ai-copy-column">
            <SectionTitle
              eyebrow="AI Recommendations"
              title="Smart fashion guidance with calm luxury presentation"
              text="This recommendation teaser is structured to plug into future AI APIs while already looking production-ready."
              align="start"
            />
          </div>
          <div className="col-lg-7">
            <div className="row g-3 ai-reco-grid">
              {items.map((card) => (
                <div key={card.id} className="col-md-4">
                  <article className="mini-reco-card reveal-up ai-reco-card">
                    <img src={card.image} alt={card.title} />
                    <div className="ai-reco-card-copy">
                      <span>{card.match}</span>
                      <h5>{card.title}</h5>
                      <p>{card.text}</p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

export default AiRecommendationPreview;
