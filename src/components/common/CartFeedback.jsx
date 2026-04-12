import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function CartFeedback() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    function handleAddToCart(event) {
      const detail = event.detail || {};
      setToast({
        id: Date.now(),
        title: detail.title || 'Added to cart successfully',
        subtitle: detail.subtitle || 'Your selection is ready for checkout.'
      });
    }

    window.addEventListener('slessaa:add-to-cart', handleAddToCart);
    return () => window.removeEventListener('slessaa:add-to-cart', handleAddToCart);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className={`cart-feedback ${toast ? 'show' : ''}`} aria-live="polite">
      {toast && (
        <>
          <div className="cart-feedback-icon">
            <i className="bi bi-bag-check"></i>
          </div>
          <div className="cart-feedback-copy">
            <strong>{toast.title}</strong>
            <span>{toast.subtitle}</span>
          </div>
          <Link to="/cart" className="cart-feedback-link">
            View Cart
          </Link>
        </>
      )}
    </div>
  );
}

export default CartFeedback;
