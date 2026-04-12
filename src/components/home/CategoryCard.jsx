function CategoryCard({ category }) {
  return (
    <article className="category-card">
      <img src={category.image} alt={category.title} />
      <div className="category-overlay">
        <span>{category.badge}</span>
        <h4>{category.title}</h4>
        <p>{category.description}</p>
        <button type="button" className="category-link">
          Explore Mood <i className="bi bi-arrow-up-right"></i>
        </button>
      </div>
    </article>
  );
}

export default CategoryCard;
