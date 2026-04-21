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

export function resolveProductMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  if (typeof window === 'undefined') return normalizedPath;

  const backendOrigin = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}:8000`;

  if (normalizedPath.startsWith('/media/')) {
    return `${backendOrigin}${normalizedPath}`;
  }

  return normalizedPath;
}

function getNestedImageValue(image) {
  if (!image) return '';
  if (typeof image === 'string') return resolveProductMediaUrl(image);
  return resolveProductMediaUrl(
    image.url ||
    image.image ||
    image.src ||
    image.path ||
    image.file ||
    ''
  );
}

export function getProductImage(product) {
  const candidates = [
    product?.image_url,
    product?.main_image,
    product?.thumbnail,
    product?.featured_image,
    product?.image,
    product?.primary_image,
    product?.cover_image,
    product?.gallery?.[0]
  ]
    .map(resolveProductMediaUrl)
    .filter(Boolean);

  if (candidates.length) return candidates[0];

  if (Array.isArray(product?.images) && product.images.length) {
    const primaryImage = product.images.find((image) => image?.is_primary || image?.primary || image?.featured);
    const nested = getNestedImageValue(primaryImage) || getNestedImageValue(product.images[0]);
    if (nested) return nested;
  }

  return getCategoryFallbackImage(product);
}

export function getProductHoverImage(product) {
  if (product?.hoverImage) {
    return resolveProductMediaUrl(product.hoverImage);
  }

  if (Array.isArray(product?.gallery) && product.gallery.length > 1) {
    return resolveProductMediaUrl(product.gallery[1]) || resolveProductMediaUrl(product.gallery[0]) || getProductImage(product);
  }

  if (Array.isArray(product?.images) && product.images.length) {
    const secondImage = getNestedImageValue(product.images[1]);
    const firstImage = getNestedImageValue(product.images[0]);
    return secondImage || firstImage || getProductImage(product);
  }

  return getProductImage(product);
}

export function getProductGallery(product) {
  if (product?.gallery?.length) {
    const resolvedGallery = product.gallery.map(resolveProductMediaUrl).filter(Boolean);
    if (resolvedGallery.length) return resolvedGallery;
  }

  if (Array.isArray(product?.images) && product.images.length) {
    const resolvedImages = product.images
      .map(getNestedImageValue)
      .filter(Boolean);
    if (resolvedImages.length) return resolvedImages;
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
