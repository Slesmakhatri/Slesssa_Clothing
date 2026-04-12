import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addCartItem, getAccessToken, listCartItems, removeCartItem, updateCartItem } from '../services/api';
import { getProductIdentifier, getProductImage, getProductPrice, getVendorId, getVendorName, getVendorUserId } from '../services/productUtils';

const LOCAL_CART_KEY = 'slessaa_cart';
const CartContext = createContext(null);

function readLocalCart() {
  const stored = window.localStorage.getItem(LOCAL_CART_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      window.localStorage.removeItem(LOCAL_CART_KEY);
    }
  }

  return [];
}

function persistLocalCart(items) {
  window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

function getCartItemKey(item) {
  return [item.productId || item.slug, item.size || '', item.color || ''].join('::');
}

function buildLocalCartItem(product, options = {}) {
  const size = options.size || product?.sizes?.[0] || '';
  const color = options.color || product?.colors?.[0] || '';
  const quantity = Math.max(1, Number(options.quantity) || 1);

  return {
    backendId: null,
    source: 'local',
    productId: product?.id,
    slug: getProductIdentifier(product),
    identityKey: getCartItemKey({
      productId: product?.id,
      slug: getProductIdentifier(product),
      size,
      color
    }),
    title: product?.title || product?.name || 'Slessaa Product',
    image: getProductImage(product),
    price: getProductPrice(product),
    quantity,
    size,
    color,
    vendorId: getVendorId(product),
    vendorUserId: getVendorUserId(product),
    vendorName: getVendorName(product),
    maxStock: Number(product?.stock || 99)
  };
}

function buildRemoteCartItem(item) {
  const product = item.product_detail || {};
  return {
    backendId: item.id,
    source: 'remote',
    productId: product.id || item.product,
    slug: getProductIdentifier(product),
    identityKey: getCartItemKey({
      productId: product.id || item.product,
      slug: getProductIdentifier(product),
      size: item.size || '',
      color: item.color || ''
    }),
    title: product.title || product.name || 'Slessaa Product',
    image: getProductImage(product),
    price: getProductPrice(product),
    quantity: item.quantity,
    size: item.size || '',
    color: item.color || '',
    vendorId: getVendorId(product),
    vendorUserId: getVendorUserId(product),
    vendorName: getVendorName(product),
    maxStock: Number(product.stock || 99)
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCart() {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        if (active) {
          setItems(readLocalCart());
          setLoading(false);
        }
        return;
      }

      try {
        const response = await listCartItems();
        if (active) {
          setItems(response.map(buildRemoteCartItem));
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Cart load failed', error.payload || error);
        }
        if (active) {
          setItems(readLocalCart());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCart();
    function handleAuthChanged() {
      loadCart();
    }

    window.addEventListener('slessaa:auth-changed', handleAuthChanged);
    return () => {
      active = false;
      window.removeEventListener('slessaa:auth-changed', handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!loading && !getAccessToken()) {
      persistLocalCart(items);
    }
  }, [items, loading]);

  function showToast(title, subtitle) {
    window.dispatchEvent(
      new CustomEvent('slessaa:add-to-cart', {
        detail: { title, subtitle }
      })
    );
  }

  async function addItem(product, options = {}) {
    const fallbackItem = buildLocalCartItem(product, options);
    const token = getAccessToken();
    const hasBackendCompatibleId = typeof product?.id === 'number';

    if (fallbackItem.maxStock <= 0) {
      showToast('Out of stock', 'This item is currently unavailable.');
      return { ok: false, source: 'local' };
    }

    if (!token || !hasBackendCompatibleId) {
      setItems((current) => {
        const existing = current.find(
          (item) => item.identityKey === fallbackItem.identityKey
        );

        if (existing) {
          return current.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(item.quantity + fallbackItem.quantity, item.maxStock || 99) }
              : item
          );
        }

        return [...current, fallbackItem];
      });

      showToast(
        `${fallbackItem.title} added to cart`,
        token
          ? 'Saved locally because this item is still using fallback catalog data.'
          : 'Saved to your guest cart. Sign in at checkout to place the order.'
      );
      return { ok: true, source: 'local' };
    }

    try {
      const response = await addCartItem({
        product: product.id,
        quantity: fallbackItem.quantity,
        size: fallbackItem.size,
        color: fallbackItem.color
      });

      const remoteItem = buildRemoteCartItem(response);
      setItems((current) => {
        const existingIndex = current.findIndex((item) => item.backendId === remoteItem.backendId);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = remoteItem;
          return next;
        }
        return [...current, remoteItem];
      });

      showToast(`${remoteItem.title} added to cart`, 'Your cart is ready for checkout.');
      return { ok: true, source: 'remote' };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Add to cart failed', error.payload || error);
      }
      const message = error.payload?.product?.[0] || error.payload?.quantity?.[0] || error.payload?.detail || 'Unable to add this item right now.';
      showToast('Could not add to cart', message);
      throw error;
    }
  }

  async function updateQuantity(targetItem, nextQuantity) {
    const quantity = Math.max(1, Number(nextQuantity) || 1);

    if (targetItem.source === 'remote' && targetItem.backendId) {
      const response = await updateCartItem(targetItem.backendId, { quantity });
      const remoteItem = buildRemoteCartItem(response);
      setItems((current) => current.map((item) => (item.backendId === targetItem.backendId ? remoteItem : item)));
      return;
    }

    setItems((current) =>
      current.map((item) =>
        (
          (item.productId === targetItem.productId && item.size === targetItem.size && item.color === targetItem.color) ||
          item.identityKey === targetItem.identityKey
        )
          ? { ...item, quantity }
          : item
      )
    );
  }

  async function removeItem(targetItem) {
    if (targetItem.source === 'remote' && targetItem.backendId) {
      await removeCartItem(targetItem.backendId);
      setItems((current) => current.filter((item) => item.backendId !== targetItem.backendId));
      return;
    }

    setItems((current) =>
      current.filter(
        (item) => item.identityKey !== targetItem.identityKey
      )
    );
  }

  async function clearCart() {
    const remoteItems = items.filter((item) => item.source === 'remote' && item.backendId);
    await Promise.all(remoteItems.map((item) => removeCartItem(item.backendId)));
    setItems([]);
    persistLocalCart([]);
  }

  const value = useMemo(
    () => ({
      items,
      loading,
      cartCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clearCart
    }),
    [items, loading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider.');
  }
  return context;
}
