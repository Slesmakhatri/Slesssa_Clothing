import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function CartPage() {
  const { items, subtotal, removeItem, updateQuantity } = useCart();

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Cart</span>
          <h1>Review your selected pieces before checkout</h1>
          <p>Premium cart interactions with promo, quantity updates, and clear order totals.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="cart-list-card">
                {items.length ? (
                  items.map((item) => (
                    <article key={`${item.backendId || item.productId}-${item.size}-${item.color}`} className="cart-item-row">
                      <img src={item.image} alt={item.title} />
                      <div className="flex-grow-1">
                        <h5>{item.title}</h5>
                        <p>Size: {item.size || 'Standard'} | Color: {item.color || 'Default'}</p>
                        <div className="d-flex gap-3 align-items-center flex-wrap">
                          <input className="form-control premium-input qty-input" type="number" min="1" value={item.quantity} onChange={(event) => updateQuantity(item, event.target.value)} />
                          <button type="button" className="btn btn-link text-decoration-none p-0" onClick={() => removeItem(item)}>Remove</button>
                        </div>
                      </div>
                      <strong>NPR {(item.price * item.quantity).toLocaleString()}</strong>
                    </article>
                  ))
                ) : (
                  <div className="empty-cart-state">
                    <h5>Your cart is empty</h5>
                    <p>Browse multiple vendor collections and add pieces to build your order.</p>
                    <Link to="/shop" className="btn btn-slessaa btn-slessaa-primary">Shop Products</Link>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-4">
              <aside className="summary-card">
                <h4>Cart Summary</h4>
                <div className="mb-3">
                  <label className="premium-label">Promo Code</label>
                  <input className="form-control premium-input" placeholder="SLESSAA10" />
                </div>
                <div className="summary-list-block">
                  <div><span>Subtotal</span><strong>NPR {subtotal.toLocaleString()}</strong></div>
                  <div><span>Delivery</span><strong>NPR {items.length ? '250' : '0'}</strong></div>
                  <div><span>Total</span><strong>NPR {(subtotal + (items.length ? 250 : 0)).toLocaleString()}</strong></div>
                </div>
                <div className="d-grid gap-3 mt-4">
                  <Link to="/checkout" onClick={(event) => !items.length && event.preventDefault()} aria-disabled={!items.length} className={`btn btn-slessaa btn-slessaa-primary ${!items.length ? 'disabled' : ''}`}>
                    Proceed to Checkout
                  </Link>
                  <Link to="/shop" className="btn btn-slessaa btn-slessaa-outline">
                    Continue Shopping
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default CartPage;
