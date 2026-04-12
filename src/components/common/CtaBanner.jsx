import ButtonLink from './ButtonLink';

function CtaBanner({ eyebrow, title, text, primaryLink, secondaryLink }) {
  return (
    <section className="cta-banner">
      <div className="container">
        <div className="cta-inner">
          <div>
            <span className="section-eyebrow">{eyebrow}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
          <div className="d-flex flex-wrap gap-3">
            <ButtonLink to={primaryLink.to} variant="primary">
              {primaryLink.label}
            </ButtonLink>
            {secondaryLink && (
              <ButtonLink to={secondaryLink.to} variant="outline">
                {secondaryLink.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CtaBanner;
