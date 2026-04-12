import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSearchSuggestions } from '../../services/api';

const RECENT_SEARCHES_KEY = 'slessaa_recent_searches';
const DEFAULT_POPULAR_SEARCHES = ['kurta', 'suit', 'dress', 'blazer', 'wedding', 'cotton'];

function readRecentSearches() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term) {
  const value = String(term || '').trim();
  if (!value) return;
  const next = [value, ...readRecentSearches().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

function productPrice(value) {
  if (value === undefined || value === null || value === '') return '';
  const amount = Number(value);
  return Number.isNaN(amount) ? '' : `NPR ${amount.toLocaleString()}`;
}

function SearchBar({
  placeholder = 'Search products, fabrics, styles...',
  value,
  onChange,
  onKeyDown,
  onSearchComplete,
  compact = false,
  ...props
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const shellRef = useRef(null);
  const inputRef = useRef(null);
  const query = String(value || '');
  const trimmedQuery = query.trim();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState({ products: [], categories: [], vendors: [], popular: DEFAULT_POPULAR_SEARCHES, total: 0 });
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!shellRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (trimmedQuery.length < 2) {
        setSuggestions((current) => ({ ...current, products: [], categories: [], vendors: [], total: 0 }));
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const payload = await getSearchSuggestions(trimmedQuery);
        if (!controller.signal.aborted) {
          setSuggestions({
            products: payload.products || [],
            categories: payload.categories || [],
            vendors: payload.vendors || [],
            popular: payload.popular || DEFAULT_POPULAR_SEARCHES,
            total: payload.total || 0
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions((current) => ({ ...current, products: [], categories: [], vendors: [], total: 0 }));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, trimmedQuery]);

  const dropdownItems = useMemo(() => {
    if (trimmedQuery.length < 2) {
      return [
        ...recentSearches.map((term) => ({ type: 'recent', label: term })),
        ...DEFAULT_POPULAR_SEARCHES.map((term) => ({ type: 'popular', label: term }))
      ].slice(0, 8);
    }

    return [
      ...suggestions.products.map((item) => ({ ...item, key: `product-${item.id || item.slug}` })),
      ...suggestions.categories.map((item) => ({ ...item, key: `category-${item.slug || item.label}` })),
      ...suggestions.vendors.map((item) => ({ ...item, key: `vendor-${item.slug || item.label}` })),
      ...(suggestions.total ? [] : suggestions.popular.slice(0, 4).map((term) => ({ type: 'popular', label: term })))
    ];
  }, [recentSearches, suggestions, trimmedQuery.length]);

  function commitSearch(term = trimmedQuery) {
    const searchTerm = String(term || '').trim();
    if (searchTerm) saveRecentSearch(searchTerm);
    setRecentSearches(readRecentSearches());
    setOpen(false);
    setActiveIndex(-1);
    onSearchComplete?.();
    navigate(searchTerm ? `/shop?search=${encodeURIComponent(searchTerm)}` : '/shop');
  }

  function handleSuggestionClick(item) {
    if (!item) return;
    if (item.type === 'product' && item.slug) {
      saveRecentSearch(item.label);
      setRecentSearches(readRecentSearches());
      setOpen(false);
      setActiveIndex(-1);
      onSearchComplete?.();
      navigate(`/shop/${item.slug}`);
      return;
    }
    if (item.type === 'category') {
      saveRecentSearch(item.label);
      setRecentSearches(readRecentSearches());
      setOpen(false);
      setActiveIndex(-1);
      onSearchComplete?.();
      navigate(`/shop?category=${encodeURIComponent(item.label)}&search=${encodeURIComponent(item.label)}`);
      return;
    }
    commitSearch(item.label);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, dropdownItems.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && dropdownItems[activeIndex]) {
        handleSuggestionClick(dropdownItems[activeIndex]);
      } else {
        commitSearch();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (onKeyDown) onKeyDown(event);
  }

  function handleInputChange(event) {
    onChange?.(event);
    setOpen(true);
    setActiveIndex(-1);
  }

  const showNoResults = open && trimmedQuery.length >= 2 && !loading && !suggestions.total;

  return (
    <div className={`search-shell ecommerce-search ${open ? 'open' : ''} ${compact ? 'compact' : ''}`} ref={shellRef}>
      <i className="bi bi-search"></i>
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        {...props}
      />
      {open ? (
        <div className="search-suggestion-panel" role="listbox">
          {trimmedQuery.length < 2 ? (
            <div className="search-suggestion-section">
              <span>{recentSearches.length ? 'Recent searches' : 'Popular searches'}</span>
              {dropdownItems.map((item, index) => (
                <button
                  key={`${item.type}-${item.label}`}
                  type="button"
                  className={`search-suggestion-item ${activeIndex === index ? 'active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSuggestionClick(item)}
                >
                  <i className={`bi ${item.type === 'recent' ? 'bi-clock-history' : 'bi-fire'}`}></i>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="search-suggestion-head">
                <span>{loading ? 'Searching...' : `Results for "${trimmedQuery}"`}</span>
                {loading ? <small>Loading</small> : null}
              </div>
              {dropdownItems.map((item, index) => (
                <button
                  key={item.key || `${item.type}-${item.label}`}
                  type="button"
                  className={`search-suggestion-item ${item.type} ${activeIndex === index ? 'active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSuggestionClick(item)}
                >
                  {item.type === 'product' ? (
                    item.image ? <img src={item.image} alt={item.label} /> : <i className="bi bi-bag"></i>
                  ) : (
                    <i className={`bi ${item.type === 'category' ? 'bi-grid' : item.type === 'vendor' ? 'bi-shop' : 'bi-search'}`}></i>
                  )}
                  <span>
                    <strong>{item.label}</strong>
                    <small>
                      {item.type === 'product'
                        ? [item.category, item.vendor, productPrice(item.price)].filter(Boolean).join(' | ')
                        : item.type === 'category'
                          ? `${item.count} products in category`
                          : item.type === 'vendor'
                            ? `${item.count} products from this vendor`
                            : 'Search term'}
                    </small>
                  </span>
                </button>
              ))}
              {showNoResults ? (
                <div className="search-suggestion-empty">
                  <strong>No matching products found</strong>
                  <p>Try a broader term like kurta, suit, wedding, cotton, or blazer.</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SearchBar;
