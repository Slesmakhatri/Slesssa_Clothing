import { Link } from 'react-router-dom';
import ProductCard from '../components/shop/ProductCard';
import SectionTitle from '../components/common/SectionTitle';
import { useWishlist } from '../context/WishlistContext';
import { useEffect, useState } from 'react';
import { listProducts } from '../services/api';
import { normalizeProduct } from '../services/catalog';

function WishlistPage() {
  const { items } = useWishlist();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    listProducts()
      .then((catalog) => setProducts(catalog.map(normalizeProduct)))
      .catch(() => setProducts([]));
  }, []);

  const wishlistProducts = products.filter((product) =>
    items.some((item) => item.identity === (product.slug || product.id) || String(item.productId) === String(product.id))
  );

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="section-eyebrow">Wishlist</span>
          <h1>Saved products for your next order</h1>
          <p>Keep customer shopping tools separate from vendor, tailor, and admin workspaces.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="table-card">
            <SectionTitle eyebrow="Customer Wishlist" title="Your saved products" align="start" />
            {wishlistProducts.length ? (
              <div className="row g-3 g-lg-4 align-items-stretch product-section-grid">
                {wishlistProducts.map((product) => (
                  <div key={product.slug || product.id} className="col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 d-flex">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="filter-empty-state">
                <h4>No wishlist items yet</h4>
                <p>Browse the product listing and save pieces you want to revisit.</p>
                <Link to="/shop" className="btn btn-slessaa btn-slessaa-primary">Browse Products</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default WishlistPage;
