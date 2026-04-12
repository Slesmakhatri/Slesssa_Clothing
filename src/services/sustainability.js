const FABRIC_PROFILES = [
  {
    keywords: ['linen', 'luxe linen', 'textured linen', 'linen blend'],
    leafScore: 5,
    impactBand: 'Lower impact',
    badge: 'Lower-impact fabric',
    note: 'Linen-based fabrics are treated as a stronger eco-conscious option because they are breathable and generally lower-impact than synthetic-heavy alternatives.'
  },
  {
    keywords: ['handloom cotton', 'structured cotton', 'textured cotton', 'premium cotton', 'cotton twill', 'cotton'],
    leafScore: 4,
    impactBand: 'Lower impact',
    badge: 'Natural fiber',
    note: 'Cotton-based fabrics are treated as a practical lower-impact option in this educational model because they are natural fibers and widely reusable across seasons.'
  },
  {
    keywords: ['wool blend', 'wool'],
    leafScore: 3,
    impactBand: 'Moderate impact',
    badge: 'Long-wear fabric',
    note: 'Wool blends are treated as moderate impact because they can support durability and colder-weather longevity, but they are not scored as highly as lighter natural fibers.'
  },
  {
    keywords: ['soft denim', 'denim'],
    leafScore: 3,
    impactBand: 'Moderate impact',
    badge: 'Durable staple',
    note: 'Denim is treated as moderate impact in this simplified model because it is durable and versatile, but not automatically low-impact.'
  },
  {
    keywords: ['silk touch', 'raw silk blend', 'silk blend', 'silk'],
    leafScore: 3,
    impactBand: 'Moderate impact',
    badge: 'Occasion fabric',
    note: 'Silk-based fabrics are treated as moderate impact in this model. They can be long-lasting for occasion wear, but they are not presented as a low-impact default.'
  },
  {
    keywords: ['jacquard', 'brocade', 'crepe', 'tech crepe'],
    leafScore: 2,
    impactBand: 'Higher impact',
    badge: 'Special finish',
    note: 'Heavily finished fabrics are treated as a higher-impact choice in this simplified guide because they tend to involve more processing than core natural-fiber staples.'
  },
  {
    keywords: ['satin luxe', 'satin finish', 'satin'],
    leafScore: 2,
    impactBand: 'Higher impact',
    badge: 'Higher-impact finish',
    note: 'Satin-style finishes are treated as a lower sustainability option in this educational model because they are often more processed or synthetic-feeling choices.'
  }
];

function normalized(value = '') {
  return String(value).trim().toLowerCase();
}

function uniqueList(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalized(value);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function getSustainabilityGuidanceForFabric(fabricName, options = {}) {
  const key = normalized(fabricName);
  if (!key) {
    return {
      fabric: '',
      leafScore: 0,
      score: null,
      impactBand: 'Unknown impact',
      label: 'Guidance unavailable',
      badge: '',
      note: 'Choose a fabric to see simplified sustainability guidance.',
      tailoringBenefit: options.forTailoring
        ? 'Custom tailoring can improve garment longevity by supporting better fit and repeat wear.'
        : ''
    };
  }

  const profile = FABRIC_PROFILES.find((item) => item.keywords.some((keyword) => key.includes(keyword)));
  const leafScore = profile?.leafScore ?? 2;
  let label = 'Balanced fabric choice';
  if (leafScore >= 4) label = 'Better fabric choice';
  if (leafScore <= 2) label = 'Style-first fabric choice';

  return {
    fabric: fabricName,
    leafScore,
    score: Math.round((leafScore / 5) * 100),
    impactBand: profile?.impactBand || 'Moderate impact',
    label,
    badge: profile?.badge || 'Material guidance limited',
    note:
      profile?.note ||
      'This fabric is shown with a cautious default score because the catalog does not yet include enough sourcing detail for a stronger sustainability claim.',
    tailoringBenefit: options.forTailoring
      ? 'Custom tailoring can improve garment longevity by supporting better fit and repeat wear.'
      : ''
  };
}

export function getSustainabilityGuidanceForProduct(product = {}) {
  if (product?.sustainability_label) {
    return {
      sustainabilityScore: product.sustainability_score ?? null,
      sustainabilityLeafScore: product.sustainability_leaf_score ?? 0,
      sustainabilityLabel: product.sustainability_label,
      impactBand: product.impact_band || 'Unknown impact',
      ecoBadges: product.eco_badges || [],
      sustainabilityNote: product.sustainability_note || '',
      fabricGuidance: product.fabric_guidance || []
    };
  }

  const fabricOptions = uniqueList(product.fabric_options || product.fabricOptions || []);
  if (!fabricOptions.length) {
    return {
      sustainabilityScore: null,
      sustainabilityLeafScore: 0,
      sustainabilityLabel: 'Guidance unavailable',
      impactBand: 'Unknown impact',
      ecoBadges: ['Material data limited'],
      sustainabilityNote: 'This product does not yet include enough fabric data for a meaningful sustainability estimate.',
      fabricGuidance: []
    };
  }

  const fabricGuidance = fabricOptions.map((fabric) => getSustainabilityGuidanceForFabric(fabric));
  const sustainabilityLeafScore = Math.round(
    fabricGuidance.reduce((sum, item) => sum + item.leafScore, 0) / fabricGuidance.length
  );
  const sustainabilityScore = Math.round((sustainabilityLeafScore / 5) * 100);
  const sustainabilityLabel =
    sustainabilityLeafScore >= 4
      ? 'Better fabric choice'
      : sustainabilityLeafScore >= 3
        ? 'Balanced fabric choice'
        : 'Style-first fabric choice';

  return {
    sustainabilityScore,
    sustainabilityLeafScore,
    sustainabilityLabel,
    impactBand:
      sustainabilityLeafScore >= 4
        ? 'Lower impact'
        : sustainabilityLeafScore >= 3
          ? 'Moderate impact'
          : 'Higher impact',
    ecoBadges: uniqueList(fabricGuidance.map((item) => item.badge).filter(Boolean)),
    sustainabilityNote: fabricGuidance[0]?.note || '',
    fabricGuidance
  };
}

export function getSustainableAlternatives(products = [], currentProduct = {}, limit = 4) {
  const currentGuidance = getSustainabilityGuidanceForProduct(currentProduct);
  const currentCategory = normalized(currentProduct.category || currentProduct.category_name || currentProduct?.category_detail?.name);
  const currentId = currentProduct.id;

  return products
    .filter((item) => item && item.id !== currentId)
    .map((item) => ({ product: item, guidance: getSustainabilityGuidanceForProduct(item) }))
    .filter(({ guidance }) => (guidance.sustainabilityScore || 0) > (currentGuidance.sustainabilityScore || 0))
    .sort((left, right) => {
      const leftCategoryBonus = normalized(left.product.category || left.product.category_name || left.product?.category_detail?.name) === currentCategory ? 30 : 0;
      const rightCategoryBonus = normalized(right.product.category || right.product.category_name || right.product?.category_detail?.name) === currentCategory ? 30 : 0;
      return (
        (right.guidance.sustainabilityScore || 0) + rightCategoryBonus - ((left.guidance.sustainabilityScore || 0) + leftCategoryBonus)
      );
    })
    .slice(0, limit)
    .map(({ product, guidance }) => ({ ...product, ...guidance }));
}

export function getSuggestedSustainableFabrics(fabrics = [], selectedFabric = '') {
  const selected = getSustainabilityGuidanceForFabric(selectedFabric, { forTailoring: true });
  return uniqueList(fabrics)
    .filter((fabric) => normalized(fabric) !== normalized(selectedFabric))
    .map((fabric) => ({ fabric, guidance: getSustainabilityGuidanceForFabric(fabric, { forTailoring: true }) }))
    .filter(({ guidance }) => (guidance.score || 0) > (selected.score || 0))
    .sort((left, right) => (right.guidance.score || 0) - (left.guidance.score || 0))
    .slice(0, 3);
}
