function renderStyledTitle(title) {
  if (!title) {
    return null;
  }

  const words = title.split(' ');
  if (words.length < 2) {
    return title;
  }

  return (
    <>
      {words.slice(0, -2).join(' ')} <span className="display-script">{words.slice(-2).join(' ')}</span>
    </>
  );
}

function SectionTitle({ eyebrow, title, text, align = 'center' }) {
  return (
    <div className={`section-title text-${align} mx-auto`}>
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      <h2>{renderStyledTitle(title)}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export default SectionTitle;
