const imagePool = [
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'
];

function getStableFashionImage(index) {
  const baseImage = imagePool[index % imagePool.length];
  const focalX = (0.24 + (index % 5) * 0.12).toFixed(2);
  const focalY = (0.16 + (index % 4) * 0.08).toFixed(2);
  const saturation = -6 + (index % 7) * 3;
  const exposure = -4 + (index % 6) * 2;
  const vibrance = (index % 5) * 4;
  return `${baseImage}&h=1200&fit=crop&crop=focalpoint&fp-x=${focalX}&fp-y=${focalY}&sat=${saturation}&exp=${exposure}&vib=${vibrance}&fm=jpg&ixlib=rb-4.0.3`;
}

const categoryImageMap = {
  Dresses: imagePool[0],
  Jeans: imagePool[10],
  'T-Shirts': imagePool[1],
  Shirts: imagePool[4],
  Hoodies: imagePool[9],
  Jackets: imagePool[5],
  Sweatshirts: imagePool[15],
  Shorts: imagePool[8],
  Skirts: imagePool[13],
  Tops: imagePool[2],
  Blazers: imagePool[5],
  Streetwear: imagePool[10],
  'Smart Casual': imagePool[1],
  Menswear: imagePool[3],
  Traditional: imagePool[6],
  'Outerwear': imagePool[5],
  'Formal Wear': imagePool[9],
  'Party Wear': imagePool[13],
  'Office Wear': imagePool[4]
};

const baseVendors = [
  {
    id: 'vendor-lalitpur-atelier',
    slug: 'lalitpur-atelier',
    brand_name: 'Lalitpur Atelier',
    description: 'Soft tailoring, bridal edits, and occasionwear with couture finishing.',
    rating: 4.9,
    specialty: 'Occasion Dresses',
    image: imagePool[0]
  },
  {
    id: 'vendor-pokhara-studio',
    slug: 'pokhara-studio',
    brand_name: 'Pokhara Studio',
    description: 'Relaxed resort silhouettes, layered co-ords, and elegant getaway fashion.',
    rating: 4.8,
    specialty: 'Resort & Co-ords',
    image: imagePool[7]
  },
  {
    id: 'vendor-kathmandu-couture',
    slug: 'kathmandu-couture',
    brand_name: 'Kathmandu Couture',
    description: 'High-polish formalwear and made-to-measure city dressing.',
    rating: 4.9,
    specialty: 'Formal Wear',
    image: imagePool[5]
  },
  {
    id: 'vendor-heritage-threads',
    slug: 'heritage-threads',
    brand_name: 'Heritage Threads',
    description: 'Traditional-inspired craftsmanship with modern Nepal wedding styling.',
    rating: 4.7,
    specialty: 'Traditional Wear',
    image: imagePool[6]
  },
  {
    id: 'vendor-urban-drape',
    slug: 'urban-drape',
    brand_name: 'Urban Drape',
    description: 'Minimal city wardrobe layers, smart casuals, and everyday premium dressing.',
    rating: 4.6,
    specialty: 'Smart Casual',
    image: imagePool[10]
  },
  {
    id: 'vendor-everest-wardrobe',
    slug: 'everest-wardrobe',
    brand_name: 'Everest Wardrobe',
    description: 'Outerwear, utility tailoring, and structured seasonal layering.',
    rating: 4.8,
    specialty: 'Outerwear',
    image: imagePool[15]
  },
  {
    id: 'vendor-terai-textiles',
    slug: 'terai-textiles',
    brand_name: 'Terai Textiles',
    description: 'Breathable fabrics, vibrant everyday wear, and polished heritage sets.',
    rating: 4.6,
    specialty: 'Traditional Casual',
    image: imagePool[16]
  },
  {
    id: 'vendor-valley-vogue',
    slug: 'valley-vogue',
    brand_name: 'Valley Vogue',
    description: 'Statement dresses, party silhouettes, and elevated styling pieces.',
    rating: 4.8,
    specialty: 'Party Wear',
    image: imagePool[13]
  },
  {
    id: 'vendor-silk-route-nepal',
    slug: 'silk-route-nepal',
    brand_name: 'Silk Route Nepal',
    description: 'Luxe silk blends, draped sets, and festive premium looks.',
    rating: 4.9,
    specialty: 'Silk & Festive',
    image: imagePool[17]
  },
  {
    id: 'vendor-modern-tailor-house',
    slug: 'modern-tailor-house',
    brand_name: 'Modern Tailor House',
    description: 'Tailoring-first store for officewear, suiting, and custom fit essentials.',
    rating: 4.7,
    specialty: 'Tailored Officewear',
    image: imagePool[4]
  },
  {
    id: 'vendor-rajwadi-edit',
    slug: 'rajwadi-edit',
    brand_name: 'Rajwadi Edit',
    description: 'Indian festive edits, lehenga styling, and occasionwear with boutique finishing.',
    rating: 4.8,
    specialty: 'Indian Occasionwear',
    image: imagePool[17]
  },
  {
    id: 'vendor-bombay-loom',
    slug: 'bombay-loom',
    brand_name: 'Bombay Loom',
    description: 'South Asian fusion pieces, relaxed kurtas, and contemporary city tailoring.',
    rating: 4.7,
    specialty: 'South Asian Fusion',
    image: imagePool[1]
  },
  {
    id: 'vendor-indian-ethnic-house',
    slug: 'indian-ethnic-house',
    brand_name: 'Indian Ethnic House',
    description: 'Celebration dressing with saree-inspired edits, lehengas, and boutique festivewear.',
    rating: 4.8,
    specialty: 'Indian Ethnic',
    image: imagePool[17]
  },
  {
    id: 'vendor-urban-street-nepal',
    slug: 'urban-street-nepal',
    brand_name: 'Urban Street Nepal',
    description: 'Oversized tees, cargo silhouettes, denim layers, and youthful casual streetwear.',
    rating: 4.6,
    specialty: 'Streetwear',
    image: imagePool[10]
  }
];

const productTemplates = [
  {
    slug: 'midi-tailored-set',
    name: 'Midi Tailored Set',
    category: 'Dresses',
    tags: ['women', 'co-ord', 'daywear'],
    colors: ['Sage', 'Ivory', 'Camel'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Linen Blend', 'Premium Cotton', 'Silk Touch'],
    basePrice: 5400,
    description: 'A polished coordinated set with soft structure, fluid movement, and a premium finish.',
    origin_style: 'Contemporary',
    imageIndexes: [3, 2, 0]
  },
  {
    slug: 'heritage-kurta-set',
    name: 'Heritage Kurta Set',
    category: 'Traditional',
    tags: ['traditional', 'kurta', 'festive'],
    colors: ['Ivory', 'Mustard', 'Rose'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Textured Cotton', 'Luxe Linen', 'Silk Blend'],
    basePrice: 4800,
    description: 'A contemporary kurta set inspired by heritage detailing and comfortable celebratory dressing.',
    origin_style: 'Nepali',
    imageIndexes: [6, 0, 17]
  },
  {
    slug: 'urban-office-shirt',
    name: 'Urban Office Shirt',
    category: 'Office Wear',
    tags: ['men', 'office', 'smart'],
    colors: ['Navy', 'Mist Blue', 'Cream'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Egyptian Cotton', 'Bamboo Blend'],
    basePrice: 3900,
    description: 'Clean office tailoring with breathable fabrication and a sharp, boardroom-ready profile.',
    origin_style: 'Contemporary',
    imageIndexes: [4, 5, 9]
  },
  {
    slug: 'city-wrap-dress',
    name: 'City Wrap Dress',
    category: 'Dresses',
    tags: ['women', 'party', 'versatile'],
    colors: ['Rose', 'Navy', 'Olive'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    fabrics: ['Crepe Luxe', 'Silk Blend'],
    basePrice: 6200,
    description: 'A fluid wrap silhouette with elevated drape, refined neckline shaping, and occasion-ready polish.',
    origin_style: 'Contemporary',
    imageIndexes: [1, 0, 8]
  },
  {
    slug: 'monsoon-coat',
    name: 'Monsoon Coat',
    category: 'Outerwear',
    tags: ['outerwear', 'structured', 'winter'],
    colors: ['Deep Navy', 'Camel', 'Charcoal'],
    sizes: ['S', 'M', 'L'],
    fabrics: ['Structured Wool', 'Cotton Twill'],
    basePrice: 8800,
    description: 'A premium coat with city structure, layered warmth, and a confident outerwear presence.',
    origin_style: 'Contemporary',
    imageIndexes: [5, 14, 4]
  },
  {
    slug: 'festive-saree-blouse',
    name: 'Festive Saree Blouse Edit',
    category: 'Traditional',
    tags: ['festive', 'blouse', 'bridal'],
    colors: ['Gold', 'Rose', 'Ivory'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Silk Luxe', 'Jacquard Blend'],
    basePrice: 4600,
    description: 'A refined blouse-inspired festive piece built for ceremony dressing and elegant styling layers.',
    origin_style: 'Indian',
    imageIndexes: [17, 6, 13]
  },
  {
    slug: 'atelier-coord-set',
    name: 'Atelier Coord Set',
    category: 'Smart Casual',
    tags: ['co-ord', 'minimal', 'premium'],
    colors: ['Teal', 'Cream', 'Olive'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Cupro Satin', 'Linen Luxe'],
    basePrice: 7200,
    description: 'An elevated co-ord with soft drape, clean lines, and effortless styling across the day.',
    origin_style: 'Fusion',
    imageIndexes: [2, 1, 13]
  },
  {
    slug: 'tailored-suit',
    name: 'Tailored Suit Set',
    category: 'Formal Wear',
    tags: ['formal', 'suiting', 'tailored'],
    colors: ['Navy', 'Charcoal', 'Beige'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Structured Wool', 'Premium Suiting'],
    basePrice: 9800,
    description: 'A sharply tailored suit set engineered for modern ceremonies, office power dressing, and events.',
    origin_style: 'Contemporary',
    imageIndexes: [9, 5, 15]
  },
  {
    slug: 'weekend-drape-shirt',
    name: 'Weekend Drape Shirt',
    category: 'Smart Casual',
    tags: ['casual', 'relaxed', 'menswear'],
    colors: ['Sage', 'Cream', 'Mist Blue'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Soft Cotton', 'Bamboo Blend'],
    basePrice: 3500,
    description: 'A relaxed drape shirt with premium softness and versatile styling for everyday city routines.',
    origin_style: 'Contemporary',
    imageIndexes: [10, 4, 18]
  },
  {
    slug: 'event-maxi-dress',
    name: 'Event Maxi Dress',
    category: 'Party Wear',
    tags: ['party', 'dress', 'occasion'],
    colors: ['Rose', 'Navy', 'Ivory'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Satin Luxe', 'Silk Blend'],
    basePrice: 7600,
    description: 'A statement maxi silhouette built for evening events, receptions, and high-polish styling moments.',
    origin_style: 'Contemporary',
    imageIndexes: [13, 0, 7]
  },
  {
    slug: 'corporate-coord',
    name: 'Corporate Coord',
    category: 'Office Wear',
    tags: ['office', 'women', 'tailored'],
    colors: ['Navy', 'Taupe', 'Ivory'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Tech Crepe', 'Premium Cotton'],
    basePrice: 6800,
    description: 'A modern workwear coord with precise structure, movement, and understated fashion authority.',
    origin_style: 'Contemporary',
    imageIndexes: [8, 1, 12]
  },
  {
    slug: 'winter-layer-jacket',
    name: 'Winter Layer Jacket',
    category: 'Outerwear',
    tags: ['jacket', 'layering', 'winter'],
    colors: ['Camel', 'Charcoal', 'Olive'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Wool Blend', 'Cotton Twill'],
    basePrice: 7900,
    description: 'A versatile layering jacket with structured shoulders, premium finish, and travel-ready warmth.',
    origin_style: 'Contemporary',
    imageIndexes: [14, 5, 9]
  },
  {
    slug: 'lehenga-edit',
    name: 'Lehenga Edit',
    category: 'Party Wear',
    tags: ['lehenga', 'indian', 'festive'],
    colors: ['Rose', 'Gold', 'Ivory'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Silk Brocade', 'Embellished Net', 'Jacquard Blend'],
    basePrice: 11200,
    description: 'A premium lehenga-inspired set with boutique embroidery energy and formal celebration styling.',
    origin_style: 'Indian',
    imageIndexes: [17, 13, 6]
  },
  {
    slug: 'daura-suruwal-set',
    name: 'Daura Suruwal Inspired Set',
    category: 'Traditional',
    tags: ['daura suruwal', 'nepali', 'menswear'],
    colors: ['Ivory', 'Charcoal', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Handloom Cotton', 'Raw Silk Blend', 'Textured Linen'],
    basePrice: 6900,
    description: 'A modern Nepali menswear edit inspired by daura suruwal structure with cleaner tailoring lines.',
    origin_style: 'Nepali',
    imageIndexes: [5, 9, 15]
  },
  {
    slug: 'sherwani-edit',
    name: 'Sherwani Edit',
    category: 'Formal Wear',
    tags: ['sherwani', 'festive', 'menswear'],
    colors: ['Ivory', 'Deep Navy', 'Gold'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Jacquard Suiting', 'Silk Blend', 'Structured Brocade'],
    basePrice: 11800,
    description: 'A premium sherwani-style look for festive menswear with tailored structure and ceremony polish.',
    origin_style: 'Indian',
    imageIndexes: [9, 5, 17]
  },
  {
    slug: 'gunyo-fusion-set',
    name: 'Gunyo Fusion Set',
    category: 'Traditional',
    tags: ['fusion', 'nepali', 'womenswear'],
    colors: ['Rose', 'Sage', 'Ivory'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Silk Cotton', 'Textured Satin', 'Soft Brocade'],
    basePrice: 8500,
    description: 'A women-led fusion set inspired by Nepali ceremonial dressing with softer contemporary drape.',
    origin_style: 'Fusion',
    imageIndexes: [0, 6, 17]
  },
  {
    slug: 'premium-straight-jeans',
    name: 'Premium Straight Jeans',
    category: 'Jeans',
    tags: ['jeans', 'denim', 'western'],
    colors: ['Classic Blue', 'Washed Black', 'Stone'],
    sizes: ['28', '30', '32', '34', '36'],
    fabrics: ['Rigid Denim', 'Comfort Stretch Denim'],
    basePrice: 4200,
    description: 'Straight-leg premium denim with a clean marketplace-ready finish for everyday elevated dressing.',
    origin_style: 'Contemporary',
    imageIndexes: [10, 4, 1]
  },
  {
    slug: 'relaxed-graphic-tee',
    name: 'Relaxed Graphic Tee',
    category: 'T-Shirts',
    tags: ['t-shirt', 'casual', 'western'],
    colors: ['White', 'Charcoal', 'Dusty Rose'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Heavy Cotton Jersey', 'Combed Cotton'],
    basePrice: 2400,
    description: 'A relaxed tee with premium weight, cleaner drape, and easy marketplace styling versatility.',
    origin_style: 'Contemporary',
    imageIndexes: [1, 10, 18]
  },
  {
    slug: 'oversized-studio-tee',
    name: 'Oversized Studio Tee',
    category: 'Streetwear',
    tags: ['oversized tee', 'streetwear', 'casual'],
    colors: ['Black', 'Cream', 'Olive'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Loopback Cotton', 'Premium Jersey'],
    basePrice: 2800,
    description: 'An oversized tee with street-led volume, a polished neckline, and soft structured shoulders.',
    origin_style: 'Contemporary',
    imageIndexes: [10, 12, 8]
  },
  {
    slug: 'resort-linen-shirt',
    name: 'Resort Linen Shirt',
    category: 'Shirts',
    tags: ['shirt', 'linen', 'casual'],
    colors: ['Ivory', 'Sky', 'Sage'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Pure Linen', 'Linen Cotton'],
    basePrice: 3600,
    description: 'A lightweight shirt designed for warm-weather dressing with a polished relaxed silhouette.',
    origin_style: 'Contemporary',
    imageIndexes: [4, 5, 16]
  },
  {
    slug: 'street-cargo-pants',
    name: 'Street Cargo Pants',
    category: 'Streetwear',
    tags: ['cargo', 'streetwear', 'utility'],
    colors: ['Olive', 'Stone', 'Black'],
    sizes: ['28', '30', '32', '34', '36'],
    fabrics: ['Cotton Twill', 'Utility Canvas'],
    basePrice: 4400,
    description: 'Utility cargo pants with a cleaner tailored line for modern casual fashion and street styling.',
    origin_style: 'Contemporary',
    imageIndexes: [10, 5, 9]
  },
  {
    slug: 'brushed-hoodie',
    name: 'Brushed Hoodie',
    category: 'Hoodies',
    tags: ['hoodie', 'casual', 'western'],
    colors: ['Sand', 'Heather Grey', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Brushed Fleece', 'French Terry'],
    basePrice: 3900,
    description: 'A premium fleece hoodie with softer volume, elevated trims, and easy cross-vendor appeal.',
    origin_style: 'Contemporary',
    imageIndexes: [9, 10, 15]
  },
  {
    slug: 'signature-sweatshirt',
    name: 'Signature Sweatshirt',
    category: 'Sweatshirts',
    tags: ['sweatshirt', 'casual', 'minimal'],
    colors: ['Cream', 'Grey', 'Rose'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Loopback Cotton', 'Soft Fleece'],
    basePrice: 3400,
    description: 'A refined sweatshirt with premium ribbing and a smarter silhouette than standard street basics.',
    origin_style: 'Contemporary',
    imageIndexes: [15, 10, 1]
  },
  {
    slug: 'tailored-shorts',
    name: 'Tailored Shorts',
    category: 'Shorts',
    tags: ['shorts', 'summer', 'western'],
    colors: ['Beige', 'Charcoal', 'Ivory'],
    sizes: ['28', '30', '32', '34'],
    fabrics: ['Structured Cotton', 'Linen Blend'],
    basePrice: 2900,
    description: 'Tailored shorts that keep warm-weather dressing sharp, clean, and appropriate for refined casualwear.',
    origin_style: 'Contemporary',
    imageIndexes: [8, 16, 4]
  },
  {
    slug: 'satin-midi-skirt',
    name: 'Satin Midi Skirt',
    category: 'Skirts',
    tags: ['skirt', 'women', 'party'],
    colors: ['Rose', 'Champagne', 'Navy'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Satin Luxe', 'Silk Touch'],
    basePrice: 4100,
    description: 'A fluid satin midi skirt for elevated pairing with blouses, crop tops, and event dressing.',
    origin_style: 'Contemporary',
    imageIndexes: [13, 0, 17]
  },
  {
    slug: 'sculpt-crop-top',
    name: 'Sculpt Crop Top',
    category: 'Tops',
    tags: ['crop top', 'women', 'western'],
    colors: ['Ivory', 'Black', 'Dusty Rose'],
    sizes: ['XS', 'S', 'M', 'L'],
    fabrics: ['Rib Knit', 'Structured Jersey'],
    basePrice: 2300,
    description: 'A sculpted crop top with premium stretch, clean finishing, and easy styling across casual edits.',
    origin_style: 'Contemporary',
    imageIndexes: [2, 13, 1]
  },
  {
    slug: 'power-blazer',
    name: 'Power Blazer',
    category: 'Blazers',
    tags: ['blazer', 'formal', 'office'],
    colors: ['Navy', 'Taupe', 'Charcoal'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    fabrics: ['Structured Suiting', 'Tech Wool'],
    basePrice: 7600,
    description: 'A sharp blazer designed for office and event crossover with a stronger premium tailoring stance.',
    origin_style: 'Contemporary',
    imageIndexes: [5, 4, 9]
  },
  {
    slug: 'denim-trucker-jacket',
    name: 'Denim Trucker Jacket',
    category: 'Jackets',
    tags: ['denim jacket', 'streetwear', 'western'],
    colors: ['Indigo', 'Washed Blue', 'Black'],
    sizes: ['S', 'M', 'L', 'XL'],
    fabrics: ['Rigid Denim', 'Washed Denim'],
    basePrice: 5200,
    description: 'A premium denim jacket with a clean trucker cut for layered street and off-duty dressing.',
    origin_style: 'Contemporary',
    imageIndexes: [10, 14, 4]
  }
];

const vendorTemplateMap = [
  [0, 3, 6, 9, 10, 15],
  [0, 1, 6, 8, 9, 3],
  [2, 7, 10, 4, 8, 14],
  [1, 5, 3, 15, 0, 6],
  [8, 0, 2, 6, 10, 11],
  [4, 11, 7, 2, 8, 10],
  [1, 8, 6, 0, 5, 3],
  [9, 3, 12, 6, 10, 5],
  [5, 12, 6, 3, 0, 1],
  [7, 10, 26, 23, 11, 13],
  [12, 14, 5, 3, 9, 7],
  [25, 12, 15, 1, 24, 9],
  [13, 15, 16, 20, 12, 5],
  [14, 17, 18, 19, 21, 27]
];

function buildProduct(vendor, template, vendorIndex, itemIndex) {
  const id = `${vendor.slug}-${template.slug}-${itemIndex + 1}`;
  const slug = id;
  const price = template.basePrice + vendorIndex * 140 + itemIndex * 90;
  const oldPrice = price + 600 + (itemIndex % 3) * 180;
  const rating = Number((4.4 + ((vendorIndex + itemIndex) % 6) * 0.1).toFixed(1));
  const reviews = 28 + vendorIndex * 11 + itemIndex * 9;
  const isNew = itemIndex % 3 === 0 || vendorIndex % 4 === 0;
  const isBestSeller = itemIndex % 2 === 0;
  const badge = isNew ? 'New' : isBestSeller ? 'Best Seller' : itemIndex % 3 === 1 ? 'Vendor Choice' : 'Tailored';
  const imageSeedBase = (vendorIndex * 6 + itemIndex) * 3;
  const mainImage = getStableFashionImage(imageSeedBase);
  const hoverImage = getStableFashionImage(imageSeedBase + 1);
  const detailImage = getStableFashionImage(imageSeedBase + 2);
  const gallery = [mainImage, hoverImage, detailImage];

  return {
    id,
    slug,
    vendor_id: vendor.id,
    vendor_name: vendor.brand_name,
    vendor_detail: {
      id: vendor.id,
      slug: vendor.slug,
      brand_name: vendor.brand_name
    },
    title: `${vendor.brand_name.split(' ')[0]} ${template.name}`,
    name: `${vendor.brand_name.split(' ')[0]} ${template.name}`,
    category: template.category,
    price,
    oldPrice,
    rating,
    reviews,
    badge,
    is_new: isNew,
    is_best_seller: isBestSeller,
    tags: [...template.tags, vendor.specialty.toLowerCase()],
    origin_style: template.origin_style,
    colors: template.colors,
    sizes: template.sizes,
    fabricOptions: template.fabrics,
    image: mainImage,
    hoverImage,
    images: [mainImage, hoverImage],
    gallery,
    description: template.description,
    popularity: 70 + vendorIndex * 2 + itemIndex * 3,
    stock: 8 + vendorIndex + itemIndex,
    related_products: [],
    suggested_products: []
  };
}

const generatedProducts = baseVendors.flatMap((vendor, vendorIndex) =>
  vendorTemplateMap[vendorIndex].map((templateIndex, itemIndex) =>
    buildProduct(vendor, productTemplates[templateIndex], vendorIndex, itemIndex)
  )
);

export const products = generatedProducts.map((product) => {
  const sameCategory = generatedProducts
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 6)
    .map((item) => item.id);

  const sameVendor = generatedProducts
    .filter((item) => item.id !== product.id && item.vendor_id === product.vendor_id)
    .slice(0, 6)
    .map((item) => item.id);

  return {
    ...product,
    related_products: sameCategory,
    suggested_products: sameVendor
  };
});

export const vendors = baseVendors.map((vendor) => {
  const vendorProducts = products.filter((product) => product.vendor_id === vendor.id);
  return {
    ...vendor,
    product_count: vendorProducts.length,
    price_from: Math.min(...vendorProducts.map((product) => product.price))
  };
});

export const categories = Object.entries(categoryImageMap).map(([title, image], index) => ({
  id: index + 1,
  title,
  description: `Marketplace collection for ${title.toLowerCase()} from multiple premium vendors and tailoring studios.`,
  image,
  badge: index % 2 === 0 ? 'Multi-Vendor' : 'Trending'
}));

export const newArrivalProducts = products.filter((product) => product.is_new).slice(0, 16);
export const bestSellerProducts = products.filter((product) => product.is_best_seller).slice(0, 16);
export const trendingProducts = [...products].sort((a, b) => b.popularity - a.popularity).slice(0, 16);
export const vendorChoiceProducts = products.filter((product) => product.badge === 'Vendor Choice').slice(0, 16);
export const freshSellerProducts = products.filter((product) => ['vendor-terai-textiles', 'vendor-silk-route-nepal', 'vendor-modern-tailor-house', 'vendor-rajwadi-edit', 'vendor-bombay-loom', 'vendor-indian-ethnic-house', 'vendor-urban-street-nepal'].includes(product.vendor_id)).slice(0, 16);
export const trendingJeans = products.filter((product) => product.category === 'Jeans').slice(0, 12);
export const popularDresses = products.filter((product) => product.category === 'Dresses').slice(0, 12);
export const casualTshirts = products.filter((product) => product.category === 'T-Shirts' || /tee/i.test(product.name)).slice(0, 12);
export const ethnicCollection = products.filter((product) => ['Traditional', 'Formal Wear', 'Party Wear'].includes(product.category) && ['Nepali', 'Indian', 'Fusion'].includes(product.origin_style)).slice(0, 12);
export const streetwearPicks = products.filter((product) => ['Streetwear', 'Hoodies', 'Jackets', 'Sweatshirts'].includes(product.category)).slice(0, 12);

export const vendorHighlights = vendors.slice(0, 6);

export const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Custom Tailoring', path: '/tailoring' },
  { label: 'AI Recommendations', path: '/recommendations' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' }
];

export const heroSlides = [
  {
    id: 1,
    eyebrow: 'Multi-vendor fashion marketplace',
    title: 'Custom Clothing, Tailored for You',
    text: 'Browse premium fashion from many Nepali vendors, ateliers, and tailoring-led brands in one polished marketplace.',
    image: imagePool[0],
    ctaPrimary: { label: 'Shop Now', to: '/shop' },
    ctaSecondary: { label: 'Customize Your Outfit', to: '/tailoring' }
  },
  {
    id: 2,
    eyebrow: 'Vendor discovery and AI style guidance',
    title: 'AI-Led Recommendations With Human Taste',
    text: 'Compare styles across stores, discover more categories, and refine your look with tailored suggestions.',
    image: imagePool[1],
    ctaPrimary: { label: 'Explore AI Looks', to: '/recommendations' },
    ctaSecondary: { label: 'Browse Vendors', to: '/shop' }
  },
  {
    id: 3,
    eyebrow: 'Fashion breadth with tailoring depth',
    title: 'Tailoring luxury for weddings, work, and everyday style',
    text: 'From boutique tailoring houses to premium fashion studios, Slessaa now feels like a true marketplace.',
    image: imagePool[2],
    ctaPrimary: { label: 'Book Tailoring', to: '/tailoring' },
    ctaSecondary: { label: 'Track Orders', to: '/track-order' }
  }
];

export const testimonials = [
  {
    id: 1,
    name: 'Aarohi Shrestha',
    role: 'Bride, Lalitpur',
    quote: 'I loved being able to compare dresses from multiple studios before choosing a tailor for the final fit.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 2,
    name: 'Ritesh Karki',
    role: 'Entrepreneur, Kathmandu',
    quote: 'The marketplace feels broad enough to browse seriously, but still premium enough to trust for custom orders.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    name: 'Nima Lama',
    role: 'Designer, Pokhara',
    quote: 'Vendor variety, polished filters, and strong recommendations made it feel like a fashion destination, not a small catalog.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
  }
];

export const howItWorks = [
  {
    step: '01',
    title: 'Discover Across Vendors',
    text: 'Browse categories, compare stores, and explore a much wider premium catalog.'
  },
  {
    step: '02',
    title: 'Shortlist Your Fit',
    text: 'Use product filters, mood cues, and vendor labels to refine what suits your wardrobe.'
  },
  {
    step: '03',
    title: 'Tailor Or Checkout',
    text: 'Order ready-to-wear pieces, request custom tailoring, or combine both in one journey.'
  },
  {
    step: '04',
    title: 'Track By Seller',
    text: 'Follow orders and tailoring progress while keeping vendor identity clear throughout the flow.'
  }
];

export const aiStyles = [
  'Minimal Luxe',
  'Modern Traditional',
  'Smart Casual',
  'Wedding Guest',
  'Workwear',
  'Street Refined'
];

export const recommendationCards = [
  {
    id: 1,
    title: 'Across Vendors: Wedding Edit',
    match: '96% style match',
    text: 'Formal dresses, festive layers, and occasion tailoring drawn from multiple top-rated sellers.',
    image: imagePool[17]
  },
  {
    id: 2,
    title: 'Across Vendors: Office Capsule',
    match: '92% style match',
    text: 'Clean officewear, tailored shirts, and structured layers across Kathmandu-focused fashion stores.',
    image: imagePool[4]
  },
  {
    id: 3,
    title: 'Across Vendors: Festive Heritage',
    match: '89% style match',
    text: 'Traditional-inspired looks from heritage-led labels with modern fabric and silhouette updates.',
    image: imagePool[6]
  }
];

export const promoSlides = [
  {
    id: 1,
    title: 'Marketplace expansion: more vendors, more custom options',
    text: 'Discover newly added tailoring studios, premium labels, and broader category coverage.',
    accent: 'New Sellers',
    link: '/shop'
  },
  {
    id: 2,
    title: 'Compare formal, casual, and tailoring-led fashion in one place',
    text: 'Use cross-vendor discovery to shortlist what fits your occasion and budget faster.',
    accent: 'Multi-Vendor',
    link: '/recommendations'
  },
  {
    id: 3,
    title: 'Shop across ateliers and still keep a premium checkout flow',
    text: 'Structured to support a true marketplace feel without losing the luxury interface.',
    accent: 'Marketplace Ready',
    link: '/checkout'
  }
];

export const chatbotMessages = [
  {
    id: 1,
    sender: 'bot',
    text: 'Welcome to Slessaa. I can help you browse across vendors, compare styles, and start tailoring requests.'
  },
  {
    id: 2,
    sender: 'user',
    text: 'Show me wedding-ready outfits from different stores.'
  },
  {
    id: 3,
    sender: 'bot',
    text: 'Try the wedding and festive recommendations first, then compare vendor pages for tailoring specialization.'
  }
];

export const cartItems = [
  {
    id: 1,
    productId: products[0].id,
    vendorId: products[0].vendor_detail.id,
    vendorName: products[0].vendor_detail.brand_name,
    title: products[0].title,
    size: products[0].sizes[2],
    color: products[0].colors[0],
    quantity: 1,
    price: products[0].price,
    image: products[0].image
  },
  {
    id: 2,
    productId: products[15].id,
    vendorId: products[15].vendor_detail.id,
    vendorName: products[15].vendor_detail.brand_name,
    title: products[15].title,
    size: products[15].sizes[1],
    color: products[15].colors[1],
    quantity: 1,
    price: products[15].price,
    image: products[15].image
  }
];

export const dashboardData = {
  customer: {
    stats: [
      { label: 'Active Orders', value: '07', icon: 'bi-bag-check' },
      { label: 'Saved Looks', value: '34', icon: 'bi-heart' },
      { label: 'Vendors Followed', value: '11', icon: 'bi-shop' }
    ],
    orders: [
      { order: '#SL-2093', item: products[6].title, status: 'Tailoring', amount: `NPR ${products[6].price}` },
      { order: '#SL-2087', item: products[11].title, status: 'Shipped', amount: `NPR ${products[11].price}` }
    ]
  },
  tailor: {
    stats: [
      { label: 'Assigned Orders', value: '24', icon: 'bi-scissors' },
      { label: 'Measurements Pending', value: '08', icon: 'bi-rulers' },
      { label: 'Dispatch Today', value: '06', icon: 'bi-truck' }
    ],
    tasks: [
      { title: 'Wedding Blouse Fitting', due: 'Today, 4:00 PM', priority: 'High' },
      { title: 'Formal Suit Alteration Batch', due: 'Tomorrow', priority: 'Medium' }
    ]
  },
  admin: {
    stats: [
      { label: 'Revenue', value: 'NPR 28.6L', icon: 'bi-graph-up-arrow' },
      { label: 'Orders', value: '1,486', icon: 'bi-box-seam' },
      { label: 'Vendors', value: String(vendors.length).padStart(2, '0'), icon: 'bi-shop-window' }
    ],
    transactions: [
      { id: 'TX-4401', customer: 'Aarohi Shrestha', method: 'eSewa', amount: 'NPR 12,800' },
      { id: 'TX-4402', customer: 'Ritesh Karki', method: 'Khalti', amount: 'NPR 8,400' }
    ]
  }
};

export const trackingSteps = [
  { label: 'Order Placed', date: 'Mar 18', completed: true },
  { label: 'Vendor Confirmed', date: 'Mar 19', completed: true },
  { label: 'Tailoring in Progress', date: 'Mar 20', completed: true },
  { label: 'Shipped', date: 'Mar 22', completed: false },
  { label: 'Delivered', date: 'Mar 24', completed: false }
];

export const footerLinks = {
  quick: ['Trending Across Vendors', 'Top Rated Stores', 'Custom Tailoring', 'AI Recommendations'],
  service: ['Track Order', 'Shipping & Returns', 'Size Guide', 'Payment Options']
};
