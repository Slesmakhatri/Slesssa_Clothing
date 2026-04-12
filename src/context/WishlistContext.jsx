import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addWishlistItem, getAccessToken, listWishlistItems, removeWishlistItem } from '../services/api';

const WISHLIST_KEY = 'slessaa_wishlist';
const WishlistContext = createContext(null);

function readWishlist() {
  const stored = window.localStorage.getItem(WISHLIST_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(WISHLIST_KEY);
    return [];
  }
}

function persistWishlist(items) {
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}

function wishlistIdentity(product) {
  return product?.slug || product?.id || null;
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadWishlist() {
      const token = getAccessToken();
      if (!token) {
        if (active) setItems(readWishlist());
        return;
      }
      try {
        const remoteItems = await listWishlistItems();
        if (!active) return;
        setItems(
          remoteItems.map((item) => ({
            id: item.id,
            identity: item.product_detail?.slug || item.product || item.product_detail?.id,
            productId: item.product,
          }))
        );
      } catch {
        if (active) setItems(readWishlist());
      }
    }

    loadWishlist();
    function handleAuthChanged() {
      loadWishlist();
    }

    window.addEventListener('slessaa:auth-changed', handleAuthChanged);
    return () => {
      active = false;
      window.removeEventListener('slessaa:auth-changed', handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      persistWishlist(items);
    }
  }, [items]);

  function isSaved(product) {
    const identity = wishlistIdentity(product);
    return items.some((item) => item.identity === identity || String(item.productId) === String(product?.id));
  }

  async function toggleWishlist(product) {
    const identity = wishlistIdentity(product);
    if (!identity) return;

    const existing = items.find((item) => item.identity === identity || String(item.productId) === String(product?.id));
    const token = getAccessToken();

    if (!token) {
      setItems((current) => (
        existing
          ? current.filter((item) => item.identity !== identity)
          : [...current, { id: null, identity, productId: product?.id }]
      ));
      return;
    }

    if (existing?.id) {
      await removeWishlistItem(existing.id);
      setItems((current) => current.filter((item) => item.id !== existing.id));
      return;
    }

    const created = await addWishlistItem({ product: product.id });
    setItems((current) => [
      ...current.filter((item) => item.identity !== identity),
      { id: created.id, identity, productId: product.id }
    ]);
  }

  const value = useMemo(
    () => ({
      items,
      wishlistCount: items.length,
      isSaved,
      toggleWishlist
    }),
    [items]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider.');
  }
  return context;
}
