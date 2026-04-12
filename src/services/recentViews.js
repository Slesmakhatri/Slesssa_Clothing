const RECENT_VIEW_KEY = 'slessaa_recent_views';
const MAX_RECENT_VIEWS = 10;

export function getRecentViewedProductIds() {
  const raw = window.localStorage.getItem(RECENT_VIEW_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => Number.isInteger(value)) : [];
  } catch {
    window.localStorage.removeItem(RECENT_VIEW_KEY);
    return [];
  }
}

export function recordRecentProductView(productId) {
  const numericId = Number(productId);
  if (!Number.isInteger(numericId)) return;
  const current = getRecentViewedProductIds().filter((value) => value !== numericId);
  const next = [numericId, ...current].slice(0, MAX_RECENT_VIEWS);
  window.localStorage.setItem(RECENT_VIEW_KEY, JSON.stringify(next));
}
