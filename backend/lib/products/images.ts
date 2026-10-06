import type { ProductDocument } from '@/types/product.types';

const PRODUCT_IMAGE_BY_SLUG: Record<string, string> = {
  'premium-beef-steak': '/images/premium-beef-steak.png',
  'whole-chicken': '/images/whole-chicken.png',
  'fresh-tilapia': '/images/fresh-tilapia.png',
  'goat-meat': '/images/goat-meat.png',
  'fresh-prawns': '/images/fresh-prawns.png',
  'scotch-bonnet-pepper': '/images/scotch-bonnet-pepper.png',
  'chicken-breast-boneless': '/images/chicken-breast.png',
  'chicken-breast': '/images/chicken-breast.png',
  'cow-tripe-shaki': '/images/cow-tripe-shaki.png',
  'chicken-lap': '/images/whole-chicken.png',
  'half-chicken': '/images/whole-chicken.png',
  'goat-leg': '/images/goat-meat.png',
  'goat-head': '/images/goat-head-market.png',
  'goat-offals': '/images/cow-tripe-shaki.png',
  'rice-full-bag': '/images/rice-market.png',
  'rice-half-bag': '/images/rice-market.png',
  'rice-paint': '/images/rice-market.png',
  'rice-small-measure': '/images/rice-market.png',
  'tomato-aposo-rice-full-bag': '/images/rice-market.png',
  'tomato-aposo-rice-half-bag': '/images/rice-market.png',
  'egusi-paint': '/images/egusi-market.png',
  'egusi-half-paint': '/images/egusi-market.png',
  'ogbono-cup': '/images/ogbono-market.png',
  'crayfish-cup': '/images/crayfish-market.png',
  'crayfish-paint': '/images/crayfish-market.png',
  'dry-fish': '/images/dry-fish-head-market.png',
  'stock-fish': '/images/dry-fish-head-market.png',
  'catfish': '/images/catfish-market.png',
  'fresh-fish': '/images/fresh-tilapia.png',
  'tomatoes-basket': '/images/tomatoes-basket-market.png',
  'tomatoes-half-basket': '/images/tomatoes-basket-market.png',
  'tomatoes-paint': '/images/tomatoes-paint-market.png',
  'fresh-pepper-paint': '/images/pepper-paint-market.png',
  'pepper-bag': '/images/pepper-bag-market.png',
  'pepper-half-tier': '/images/pepper-bag-market.png',
  'onions-bag': '/images/onions-market.png',
  'carrots': '/images/carrots-market.png',
  'green-pepper': '/images/green-pepper-market.png',
  'green-beans': '/images/green-beans-market.png',
  'cucumber': '/images/cucumber-market.png',
  ugu: '/images/ugu-market.png',
  potato: '/images/potato-market.png',
  plantain: '/images/plantain-market.png',
  'palm-kernel': '/images/palm-kernel-market.png',
  'palm-oil': '/images/palm-oil-market.png',
  'groundnut-oil': '/images/groundnut-oil-market.png',
  flour: '/images/flour-market.png',
  sugar: '/images/sugar-market.png',
  yam: '/images/yam-market.png',
  beans: '/images/beans-market.png',
};

const KEYWORD_IMAGE: Array<[string, string]> = [
  ['chicken breast', '/images/chicken-breast.png'],
  ['chicken lap', '/images/whole-chicken.png'],
  ['half chicken', '/images/whole-chicken.png'],
  ['whole chicken', '/images/whole-chicken.png'],
  ['goat head', '/images/goat-head-market.png'],
  ['goat leg', '/images/goat-meat.png'],
  ['goat offal', '/images/cow-tripe-shaki.png'],
  ['goat', '/images/goat-meat.png'],
  ['beef', '/images/premium-beef-steak.png'],
  ['tilapia', '/images/fresh-tilapia.png'],
  ['fish', '/images/fresh-tilapia.png'],
  ['prawn', '/images/fresh-prawns.png'],
  ['rice half', '/images/rice-market.png'],
  ['rice paint', '/images/rice-market.png'],
  ['rice small', '/images/rice-market.png'],
  ['rice', '/images/rice-market.png'],
  ['aposo', '/images/rice-market.png'],
  ['egusi half', '/images/egusi-market.png'],
  ['egusi', '/images/egusi-market.png'],
  ['ogbono', '/images/ogbono-market.png'],
  ['crayfish', '/images/crayfish-market.png'],
  ['stock fish', '/images/dry-fish-head-market.png'],
  ['stockfish', '/images/dry-fish-head-market.png'],
  ['dry fish', '/images/dry-fish-head-market.png'],
  ['catfish', '/images/catfish-market.png'],
  ['fresh fish', '/images/fresh-tilapia.png'],
  ['tomatoes paint', '/images/tomatoes-paint-market.png'],
  ['tomatoes half', '/images/tomatoes-basket-market.png'],
  ['tomatoes basket', '/images/tomatoes-basket-market.png'],
  ['tomato', '/images/tomatoes-basket-market.png'],
  ['pepper bag', '/images/pepper-bag-market.png'],
  ['pepper half', '/images/pepper-bag-market.png'],
  ['pepper paint', '/images/pepper-paint-market.png'],
  ['pepper', '/images/pepper-paint-market.png'],
  ['onion', '/images/onions-market.png'],
  ['carrot', '/images/carrots-market.png'],
  ['green pepper', '/images/green-pepper-market.png'],
  ['green beans', '/images/green-beans-market.png'],
  ['cucumber', '/images/cucumber-market.png'],
  ['ugu', '/images/ugu-market.png'],
  ['potato', '/images/potato-market.png'],
  ['plantain', '/images/plantain-market.png'],
  ['palm kernel', '/images/palm-kernel-market.png'],
  ['palm oil', '/images/palm-oil-market.png'],
  ['groundnut oil', '/images/groundnut-oil-market.png'],
  ['oil', '/images/groundnut-oil-market.png'],
  ['flour', '/images/flour-market.png'],
  ['sugar', '/images/sugar-market.png'],
  ['yam', '/images/yam-market.png'],
  ['beans', '/images/beans-market.png'],
];

function generatedMissingImage(slug: string, imageUrl: string) {
  return (
    imageUrl === `/images/${slug}.png` ||
    imageUrl === `/images/${slug}.jpg` ||
    imageUrl === `/images/${slug}.svg`
  );
}

export function getProductImage(product: Pick<ProductDocument, 'slug' | 'name' | 'image_urls'>) {
  const firstImage = product.image_urls?.[0]?.trim();
  const mappedImage = PRODUCT_IMAGE_BY_SLUG[product.slug];

  if (firstImage && !firstImage.startsWith('/images/') && !generatedMissingImage(product.slug, firstImage)) {
    return firstImage;
  }

  if (mappedImage) {
    return mappedImage;
  }

  const searchableName = product.name.toLowerCase();
  const keywordMatch = KEYWORD_IMAGE.find(([keyword]) => searchableName.includes(keyword));

  return keywordMatch?.[1] ?? firstImage ?? '';
}
