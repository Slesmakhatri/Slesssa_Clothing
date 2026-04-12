import SearchBar from '../common/SearchBar';

const curatedOptions = ['New Arrivals', 'Best Seller', 'Seasonal Picks'];

function FilterBlock({ title, children }) {
  return (
    <div className="filter-group">
      <div className="filter-group-head">
        <h6>{title}</h6>
      </div>
      {children}
    </div>
  );
}

function FilterOption({ label, checked, onChange }) {
  return (
    <label className="filter-check premium-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function FilterSidebar({
  categoryGroups,
  activeAudience,
  activeCategory,
  onSelectCategoryLink,
  searchValue,
  onSearchChange,
  sortValue,
  onSortChange,
  priceRange,
  minPrice,
  maxPrice,
  filters,
  options,
  resultCount,
  onPriceRangeChange,
  onToggleFilter,
  onReset,
  onClose
}) {
  return (
    <aside className="filter-card shop-filter-card">
      <div className="filter-panel-top">
        <div>
          <span className="section-eyebrow">Filters</span>
          <h5>Refine the collection</h5>
        </div>
        <button type="button" className="btn btn-link filter-close-btn d-lg-none" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <div className="filter-result-pill">{resultCount} products</div>

      <div className="filter-search-wrap">
        <SearchBar placeholder="Search product or category..." value={searchValue} onChange={onSearchChange} />
      </div>

      <FilterBlock title="Category">
        <div className="shop-category-nav">
          {categoryGroups.map((group) => (
            <div key={group.label} className="shop-category-group">
              <span className="shop-category-heading">{group.label}</span>
              <div className="shop-category-links">
                {group.featured.map((item) => {
                  const active = activeAudience === group.label && activeCategory === item;
                  return (
                    <button
                      key={`${group.label}-${item}`}
                      type="button"
                      className={`shop-category-link ${active ? 'active' : ''}`}
                      onClick={() => onSelectCategoryLink(group.label, item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Sort By">
        <select className="form-select premium-input filter-select" value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </FilterBlock>

      <FilterBlock title="Price">
        <input type="range" className="form-range" min={minPrice} max={maxPrice} value={priceRange} onChange={(event) => onPriceRangeChange(Number(event.target.value))} />
        <div className="filter-range-meta">
          <span>NPR {minPrice.toLocaleString()}</span>
          <strong>Up to NPR {priceRange.toLocaleString()}</strong>
        </div>
      </FilterBlock>

      <FilterBlock title="Size">
        <div className="filter-chip-grid">
          {options.sizes.map((value) => (
            <button
              key={value}
              type="button"
              className={`filter-chip ${filters.sizes.includes(value) ? 'active' : ''}`}
              onClick={() => onToggleFilter('sizes', value)}
            >
              {value}
            </button>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Curated">
        {curatedOptions.map((value) => (
          <FilterOption
            key={value}
            label={value}
            checked={filters.curated.includes(value)}
            onChange={() => onToggleFilter('curated', value)}
          />
        ))}
      </FilterBlock>

      <button type="button" className="btn btn-slessaa btn-slessaa-outline w-100 mt-2" onClick={onReset}>
        Reset Filters
      </button>
    </aside>
  );
}

export default FilterSidebar;
