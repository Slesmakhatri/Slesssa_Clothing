export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmxhemVyfGVufDB8fDB8fHww&ixlib=rb-4.1.0&q=60&w=3000';

const CATEGORY_FALLBACKS = {
  't-shirts': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  'tshirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  jeans: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80',
  shirts: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  shirt: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  blazers: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
  blazer: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
  skirts: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
  skirt: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
  hoodies: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  hoodie: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  sweaters: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  sweater: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  kurtas: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
  kurta: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
  traditional: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
  dresses: 'https://images.unsplash.com/photo-1753549839764-c7f0b02bd693?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  dress: 'https://images.unsplash.com/photo-1753549839764-c7f0b02bd693?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000',
  coats: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=80',
  coat: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=80',
  jackets: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  jacket: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  trousers: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80',
  trouser: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80',
  shorts: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80',
  short: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80',
  tracksuits: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  tracksuit: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  tops: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  outerwear: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=80'
};

export function getCategoryName(product) {
  return product?.category_detail?.name || product?.category_name || product?.category || '';
}

export function getCategoryFallbackImage(product) {
  const key = getCategoryName(product).trim().toLowerCase();
  const garmentType = String(product?.garmentType || '').trim().toLowerCase();
  return CATEGORY_FALLBACKS[key] || CATEGORY_FALLBACKS[garmentType] || DEFAULT_PRODUCT_IMAGE;
}

export function getProductIdentifier(product) {
  return product?.slug || product?.id || null;
}

export function getProductDetailPath(product) {
  const identifier = getProductIdentifier(product);
  return identifier ? `/shop/${encodeURIComponent(identifier)}` : '/shop';
}

export function getProductImage(product) {
  if (product?.image_url) {
    return product.image_url;
  }

  if (product?.image) {
    return product.image;
  }

  if (product?.images?.length) {
    if (typeof product.images[0] === 'string') {
      return product.images[0];
    }

    return product.images.find((image) => image.is_primary)?.image || product.images[0].image;
  }

  return getCategoryFallbackImage(product);
}

export function getProductHoverImage(product) {
  if (product?.hoverImage) {
    return product.hoverImage;
  }

  if (product?.images?.length) {
    if (typeof product.images[0] === 'string') {
      return product.images[1] || product.images[0];
    }

    return product.images[1]?.image || product.images[0]?.image || getProductImage(product);
  }

  return getProductImage(product);
}

export function getProductGallery(product) {
  if (product?.gallery?.length) {
    return product.gallery;
  }

  if (product?.images?.length) {
    if (typeof product.images[0] === 'string') {
      return product.images;
    }

    return product.images.map((image) => image.image);
  }

  return [getProductImage(product)];
}

export function getProductPrice(product) {
  return Number(product?.price || 0);
}

export function getProductOldPrice(product) {
  return Number(product?.oldPrice || product?.discount_price || product?.sale_price || product?.price || 0);
}

export function getProductReviews(product) {
  return product?.reviews || product?.reviews_count || 24;
}

export function getVendorName(product) {
  return (
    product?.vendor_detail?.brand_name ||
    product?.vendorName ||
    product?.vendor_name ||
    product?.store_name ||
    'Slessaa Atelier'
  );
}

export function getVendorId(product) {
  return product?.vendor_detail?.id || product?.vendorId || product?.vendor || null;
}

export function getVendorUserId(product) {
  return product?.vendor_detail?.user || product?.vendorUserId || product?.vendor_user || product?.vendor_user_id || null;
}

export function getProductType(product) {
  return product?.productType || product?.product_type || (product?.isCustomizable || product?.is_customizable ? 'both' : 'ready_made');
}

export function isReadyMadeProduct(product) {
  return ['ready_made', 'both'].includes(getProductType(product));
}

export function isCustomizableProduct(product) {
  return Boolean(product?.isCustomizable || product?.is_customizable || ['customizable', 'both'].includes(getProductType(product)));
}
