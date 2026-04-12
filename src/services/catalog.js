import {
  getProductGallery,
  getProductHoverImage,
  getProductIdentifier,
  getProductImage,
  getProductOldPrice,
  getProductPrice,
  getProductReviews
} from './productUtils';
import { getSustainabilityGuidanceForProduct } from './sustainability';

function getImageIdentity(url = '') {
  return String(url).split('?')[0].trim().toLowerCase();
}

function getNameIdentity(name = '') {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeProduct(product) {
  const category = product?.category_detail?.name || product?.category_name || product?.category || 'Ready to Wear';
  const sizes = Array.isArray(product?.sizes) ? product.sizes.filter(Boolean) : [];
  const colors = Array.isArray(product?.colors) ? product.colors.filter(Boolean) : [];
  const badge = product?.badge || (product?.is_new ? 'New In' : product?.is_best_seller ? 'Best Seller' : '');
  const fabricOptions = Array.isArray(product?.fabric_options)
    ? product.fabric_options.filter(Boolean)
    : Array.isArray(product?.fabricOptions)
      ? product.fabricOptions.filter(Boolean)
      : [];
  const sustainability = getSustainabilityGuidanceForProduct({ ...product, fabric_options: fabricOptions });

  return {
    ...product,
    id: product?.id,
    slug: getProductIdentifier(product),
    name: product?.name || product?.title || 'Slessaa Piece',
    title: product?.title || product?.name || 'Slessaa Piece',
    category,
    description: product?.description || 'Crafted for a refined, everyday wardrobe.',
    price: getProductPrice(product),
    oldPrice: getProductOldPrice(product),
    image: getProductImage(product),
    hoverImage: getProductHoverImage(product),
    gallery: getProductGallery(product),
    fabric_options: fabricOptions,
    fabricOptions,
    productType: product?.product_type || (product?.is_customizable ? 'both' : 'ready_made'),
    isCustomizable: Boolean(product?.is_customizable || product?.product_type === 'customizable' || product?.product_type === 'both'),
    sustainabilityGuidance: product?.sustainability_guidance || '',
    customizationNote: product?.customization_note || '',
    sizes,
    colors,
    reviews: getProductReviews(product),
    rating: Number(product?.rating || 0),
    badge,
    tags: Array.isArray(product?.tags) ? product.tags : [],
    ...sustainability
  };
}

export function dedupeProducts(products) {
  const seen = new Set();
  const normalized = products.map(normalizeProduct);

  return normalized.filter((product) => {
    const signature = [getNameIdentity(product.name), getImageIdentity(product.image)].join('::');
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

export function buildCuratedCollections(products) {
  const catalog = dedupeProducts(products);
  return {
    catalog,
    newIn: catalog.filter((product) => product.is_new || /new/i.test(product.badge)).slice(0, 12),
    trending: [...catalog].sort((left, right) => Number(right.popularity || 0) - Number(left.popularity || 0)).slice(0, 12),
    recommended: [...catalog].sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0)).slice(0, 12),
    dresses: catalog.filter((product) => /dress/i.test(product.category)).slice(0, 12),
    essentials: catalog.filter((product) => /shirt|tee|jean|top/i.test(`${product.category} ${product.name}`)).slice(0, 12)
  };
}

export function findProductByIdentity(products, productIdOrSlug) {
  const normalized = dedupeProducts(products);
  return normalized.find((item) => String(item.id) === String(productIdOrSlug) || item.slug === productIdOrSlug) || null;
}

export function getRelatedProducts(products, currentProduct, limit = 4) {
  const normalized = dedupeProducts(products);
  const current = normalizeProduct(currentProduct);

  const sameCategory = normalized.filter((item) => item.id !== current.id && item.category === current.category);
  const sameMood = normalized.filter(
    (item) =>
      item.id !== current.id &&
      item.category !== current.category &&
      item.tags.some((tag) => current.tags.includes(tag))
  );

  return [...sameCategory, ...sameMood].slice(0, limit);
}
