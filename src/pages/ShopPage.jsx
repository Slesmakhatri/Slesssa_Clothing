import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuickViewModal from '../components/common/QuickViewModal';
import FilterSidebar from '../components/shop/FilterSidebar';
import ProductCard from '../components/shop/ProductCard';
import { storefrontMenus, storefrontProducts } from '../data/storefront';
import { listProducts } from '../services/api';
import { buildCuratedCollections } from '../services/catalog';

const INITIAL_VISIBLE_COUNT = 12;
const FALLBACK_CATALOG = buildCuratedCollections(storefrontProducts).catalog;

function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [catalog, setCatalog] = useState(FALLBACK_CATALOG);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [sortValue, setSortValue] = useState('featured');
  const [filters, setFilters] = useState({
    audiences: searchParams.get('audience') ? [searchParams.get('audience')] : [],
    categories: searchParams.get('category') ? [searchParams.get('category')] : [],
    sizes: [],
    curated: searchParams.get('curated') ? [searchParams.get('curated')] : []
  });

  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
    setFilters((current) => ({
      ...current,
      audiences: searchParams.get('audience') ? [searchParams.get('audience')] : [],
      categories: searchParams.get('category') ? [searchParams.get('category')] : [],
      curated: searchParams.get('curated') ? [searchParams.get('curated')] : []
    }));
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    listProducts()
      .then((items) => {
        if (active) {
          const apiItems = Array.isArray(items) ? items : [];
          const nextCatalog = apiItems.length ? buildCuratedCollections(apiItems).catalog : FALLBACK_CATALOG;
          if (import.meta.env.DEV) {
            console.debug('ShopPage products API response', {
              count: apiItems.length,
              sample: apiItems[0] || null
            });
          }
          setCatalog(nextCatalog);
        }
      })
      .catch(() => {
        if (active) {
          setCatalog(FALLBACK_CATALOG);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const minPrice = useMemo(
    () => (catalog.length ? Math.min(...catalog.map((product) => Number(product.price))) : 0),
    [catalog]
  );
  const maxPrice = useMemo(
    () => (catalog.length ? Math.max(...catalog.map((product) => Number(product.price))) : 10000),
    [catalog]
  );
  const [priceRange, setPriceRange] = useState(maxPrice);

  useEffect(() => {
    setPriceRange(maxPrice);
  }, [maxPrice]);

  const options = useMemo(
    () => ({
      audiences: [...new Set(catalog.map((product) => product.audience))].sort(),
      categories: [...new Set(catalog.map((product) => product.category))].sort(),
      sizes: [...new Set(catalog.flatMap((product) => product.sizes || []))]
    }),
    [catalog]
  );

  function toggleFilter(group, value) {
    setFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value]
    }));
  }

  function selectCategoryLink(audience, category) {
    setFilters((current) => {
      const isActive = current.audiences[0] === audience && current.categories[0] === category;
      if (isActive) {
        return {
          ...current,
          audiences: [],
          categories: []
        };
      }

      return {
        ...current,
        audiences: [audience],
        categories: [category]
      };
    });
  }

  function resetFilters() {
    setSearchValue('');
    setSortValue('featured');
    setPriceRange(maxPrice);
    setFilters({
      audiences: [],
      categories: [],
      sizes: [],
      curated: []
    });
    setSearchParams({});
  }

  const filteredProducts = useMemo(() => {
    const loweredSearch = searchValue.trim().toLowerCase();

    const nextProducts = catalog.filter((product) => {
      const matchesSearch =
        !loweredSearch ||
        [
          product.name,
          product.title,
          product.description,
          product.category,
          product.category_name,
          product.audience,
          product.vendor_name,
          product.vendor_detail?.brand_name,
          product.badge,
          product.product_type,
          ...(product.tags || []),
          ...(product.colors || []),
          ...(product.fabric_options || []),
          ...(product.sizes || [])
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(loweredSearch));

      const matchesAudience = !filters.audiences.length || filters.audiences.includes(product.audience);
      const matchesCategory = !filters.categories.length || filters.categories.includes(product.category);
      const matchesSize = !filters.sizes.length || filters.sizes.some((size) => product.sizes.includes(size));
      const matchesPrice = Number(product.price) <= priceRange;
      const matchesCurated =
        !filters.curated.length ||
        filters.curated.every((tag) => {
          if (tag === 'New Arrivals') return product.is_new;
          if (tag === 'Best Seller') return product.is_best_seller;
          if (tag === 'Seasonal Picks') return ['Coats', 'Blazers', 'Kurtas'].includes(product.category);
          return true;
        });

      return matchesSearch && matchesAudience && matchesCategory && matchesSize && matchesPrice && matchesCurated;
    });

    nextProducts.sort((left, right) => {
      if (sortValue === 'price-asc') return left.price - right.price;
      if (sortValue === 'price-desc') return right.price - left.price;
      if (sortValue === 'newest') return Number(right.is_new) - Number(left.is_new);
      return right.popularity - left.popularity;
    });

    if (import.meta.env.DEV) {
      console.debug('ShopPage filter state', {
        catalogCount: catalog.length,
        searchValue,
        sortValue,
        filters,
        priceRange,
        filteredCount: nextProducts.length,
        firstFilteredProduct: nextProducts[0] || null
      });
    }

    return nextProducts;
  }, [catalog, filters, priceRange, searchValue, sortValue]);

  useEffect(() => {
    const nextParams = {};
    if (searchValue) nextParams.search = searchValue;
    if (filters.audiences[0]) nextParams.audience = filters.audiences[0];
    if (filters.categories[0]) nextParams.category = filters.categories[0];
    if (filters.curated[0]) nextParams.curated = filters.curated[0];
    setSearchParams(nextParams, { replace: true });
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [filters.audiences, filters.categories, filters.curated, searchValue, setSearchParams]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <>
      <section className="page-hero shop-hero">
        <div className="container shop-hero-grid">
          <div>
            <span className="section-eyebrow">Shop</span>
            <h1>Browse clothing by category, size, and wardrobe purpose.</h1>
            <p>
              The shop is now driven by one canonical catalog, so every product card, search result, related item, and
              cart line uses the same name, slug, image, and sizing.
            </p>
          </div>
          <div className="shop-hero-stat">
            <strong>{filteredProducts.length}</strong>
            <span>styles ready to browse</span>
          </div>
        </div>
      </section>

      <section className="section-space shop-page-shell">
        <div className="container">
          <div className="shop-mobile-tools d-lg-none">
            <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => setFiltersOpen(true)}>
              <i className="bi bi-sliders me-2"></i> Filters
            </button>
            <div className="shop-result-inline">{filteredProducts.length} results</div>
          </div>

          <div className={`shop-filter-overlay ${filtersOpen ? 'open' : ''}`} onClick={() => setFiltersOpen(false)}></div>

          <div className="shop-layout-shell">
            <div className={`shop-sidebar-column ${filtersOpen ? 'open' : ''}`}>
              <FilterSidebar
                categoryGroups={storefrontMenus.gender}
                activeAudience={filters.audiences[0] || ''}
                activeCategory={filters.categories[0] || ''}
                onSelectCategoryLink={selectCategoryLink}
                searchValue={searchValue}
                onSearchChange={(event) => setSearchValue(event.target.value)}
                sortValue={sortValue}
                onSortChange={setSortValue}
                priceRange={priceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                filters={filters}
                options={options}
                resultCount={filteredProducts.length}
                onPriceRangeChange={setPriceRange}
                onToggleFilter={toggleFilter}
                onReset={resetFilters}
                onClose={() => setFiltersOpen(false)}
              />
            </div>

            <div className="shop-products-column">
              <div className="shop-toolbar premium-shop-toolbar">
                <div className="shop-toolbar-copy">
                  <span className="section-eyebrow">Collection</span>
                  <h2>Category-first product browsing with premium card design.</h2>
                </div>
                <div className="shop-toolbar-summary">
                  <strong>{filteredProducts.length}</strong>
                  <span>matching products</span>
                </div>
              </div>

              {loading ? (
                <div className="filter-empty-state">
                  <h4>Loading collection</h4>
                  <p>Preparing a stable catalog and category filters.</p>
                </div>
              ) : visibleProducts.length ? (
                <div className="shop-product-grid">
                  {visibleProducts.map((product) => (
                    <div key={product.slug || product.id}>
                      <ProductCard product={product} onQuickView={setSelectedProduct} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="filter-empty-state">
                  <h4>No products match the current filters</h4>
                  <p>Try removing a filter or widening the price range.</p>
                  <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={resetFilters}>
                    Reset Filters
                  </button>
                </div>
              )}

              {visibleProducts.length < filteredProducts.length ? (
                <div className="text-center mt-4">
                  <button className="btn btn-slessaa btn-slessaa-primary" onClick={() => setVisibleCount((current) => current + 8)}>
                    Load More
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}

export default ShopPage;
