function TestimonialCard({ item }) {
  return (
    <article className="testimonial-card">
      <div className="testimonial-head">
        <img src={item.image} alt={item.name} />
        <div>
          <h5>{item.name}</h5>
          <span>{item.role}</span>
        </div>
      </div>
      <p>{item.quote}</p>
    </article>
  );
}

export default TestimonialCard;
