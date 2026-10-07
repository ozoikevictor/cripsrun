'use client';

import { useMemo, useState } from 'react';
import { ProductImage as Image } from './ProductImage';
import { ChevronDown, Leaf, PackageOpen } from 'lucide-react';

import { ProductCard } from './ProductCard';
import { getProductImage } from '@/lib/products/images';
import { cn } from '@/lib/utils';
import type { ProductDocument } from '@/types/product.types';

interface ProductGroupGridProps {
  products: ProductDocument[];
}

interface ProductFamily {
  id: string;
  label: string;
  description: string;
  keywords: string[];
}

const PRODUCT_FAMILIES: ProductFamily[] = [
  {
    id: 'chicken',
    label: 'Chicken',
    description: 'Whole chicken, half chicken, lap, leg, breast, head, and other parts.',
    keywords: ['chicken', 'hen', 'poultry', 'lap', 'breast', 'wing', 'drumstick', 'bombo'],
  },
  {
    id: 'goat',
    label: 'Goat meat',
    description: 'Goat meat, leg, head, offals, mixed cuts, and special cuts.',
    keywords: ['goat'],
  },
  {
    id: 'beef',
    label: 'Beef',
    description: 'Beef steak, cow meat, shaki, tripe, and fresh beef cuts.',
    keywords: ['beef', 'steak', 'cow', 'shaki', 'tripe'],
  },
  {
    id: 'fish',
    label: 'Fish & seafood',
    description: 'Tilapia, prawns, catfish, croaker, and seafood items.',
    keywords: ['fish', 'tilapia', 'prawn', 'seafood', 'catfish', 'croaker', 'shrimp'],
  },
  {
    id: 'dry-fish',
    label: 'Dry fish & stock fish',
    description: 'Dry fish, stock fish, and dried fish options for soup and stew.',
    keywords: ['dry fish', 'stock fish', 'stockfish', 'dried fish'],
  },
  {
    id: 'rice',
    label: 'Rice',
    description: 'Full bag, half bag, paint, small measure, and other rice sizes.',
    keywords: ['rice', 'aposo'],
  },
  {
    id: 'beans',
    label: 'Beans',
    description: 'Beans by cup, paint, half paint, bag, and household measures.',
    keywords: ['beans'],
  },
  {
    id: 'tomatoes',
    label: 'Tomatoes',
    description: 'Basket, half basket, paint, and smaller tomato measures.',
    keywords: ['tomato', 'tomatoes'],
  },
  {
    id: 'pepper',
    label: 'Pepper',
    description: 'Fresh pepper by paint, cup, basket, and other measures.',
    keywords: ['pepper', 'scotch bonnet', 'rodo', 'tatashe'],
  },
  {
    id: 'onions',
    label: 'Onions',
    description: 'Onions by bag, basket, paint, and smaller market measures.',
    keywords: ['onion', 'onions'],
  },
  {
    id: 'oil',
    label: 'Oil',
    description: 'Vegetable oil, palm oil, bottle, keg, litre, and refill sizes.',
    keywords: ['oil', 'vegetable oil', 'palm oil', 'groundnut oil'],
  },
  {
    id: 'garri',
    label: 'Garri',
    description: 'Garri by cup, paint, half paint, bag, and family measures.',
    keywords: ['garri', 'gari', 'cassava flakes'],
  },
  {
    id: 'crayfish',
    label: 'Crayfish',
    description: 'Crayfish by cup, half paint, paint, and market measures.',
    keywords: ['crayfish'],
  },
  {
    id: 'bread',
    label: 'Bread',
    description: 'Sliced bread, family loaf, small loaf, and bakery options.',
    keywords: ['bread', 'loaf'],
  },
  {
    id: 'vegetables',
    label: 'Vegetables',
    description: 'Fresh vegetables, soup leaves, stew leaves, and bundles.',
    keywords: [
      'vegetable',
      'vegetables',
      'ugu',
      'spinach',
      'leaf',
      'leaves',
      'okra',
      'carrot',
      'green pepper',
      'green beans',
      'cucumber',
    ],
  },
  {
    id: 'potato',
    label: 'Potato',
    description: 'Irish potato, sweet potato, basket, paint, and kilogram options.',
    keywords: ['potato'],
  },
  {
    id: 'yam',
    label: 'Yam',
    description: 'Full tuber, half tuber, slices, and kilogram options.',
    keywords: ['yam', 'tuber'],
  },
  {
    id: 'plantain',
    label: 'Plantain',
    description: 'Ripe plantain, unripe plantain, bunch, fingers, and kilogram options.',
    keywords: ['plantain', 'ripe plantain', 'unripe plantain', 'half bunch', 'bunch', 'fingers'],
  },
  {
    id: 'palm-kernel',
    label: 'Palm kernel',
    description: 'Palm kernel and palm produce items.',
    keywords: ['palm kernel', 'pankane', 'palm nut'],
  },
  {
    id: 'flour',
    label: 'Flour & baking',
    description: 'Flour, sugar, baking items, and measured dry goods.',
    keywords: ['flour', 'sugar', 'wheat', 'baking'],
  },
  {
    id: 'soup-items',
    label: 'Soup ingredients',
    description: 'Egusi, ogbono, soup spices, dry fish, and other soup items.',
    keywords: ['egusi', 'ogbono', 'soup'],
  },
];

const fallbackFamily: ProductFamily = {
  id: 'other',
  label: 'Other foodstuff',
  description: 'Other fresh market items and groceries.',
  keywords: [],
};

function productSearchText(product: ProductDocument) {
  return [
    product.name,
    product.slug,
    product.description,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ]
    .join(' ')
    .toLowerCase();
}

function getFamilyForProduct(product: ProductDocument) {
  const searchable = productSearchText(product);

  return (
    PRODUCT_FAMILIES.find((family) =>
      family.keywords.some((keyword) => searchable.includes(keyword))
    ) ?? fallbackFamily
  );
}

function sortProductsByName(products: ProductDocument[]) {
  return products.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function ProductGroupGrid({ products }: ProductGroupGridProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const grouped = new Map<
      string,
      { family: ProductFamily; products: ProductDocument[] }
    >();

    products.forEach((product) => {
      const family = getFamilyForProduct(product);
      const existing = grouped.get(family.id);

      if (existing) {
        existing.products.push(product);
      } else {
        grouped.set(family.id, { family, products: [product] });
      }
    });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        products: sortProductsByName(group.products),
      }))
      .sort((a, b) => {
        const aIndex = PRODUCT_FAMILIES.findIndex((family) => family.id === a.family.id);
        const bIndex = PRODUCT_FAMILIES.findIndex((family) => family.id === b.family.id);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
  }, [products]);

  if (groups.length === 0) {
    return (
      <div className="site-soft-panel flex flex-col items-center justify-center rounded-xl py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Leaf className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium">No products found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try another search or category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(({ family, products: groupProducts }) => {
        const isOpen = openGroups[family.id] ?? groups.length === 1;
        const leadProduct = groupProducts[0];
        const image = leadProduct ? getProductImage(leadProduct) : '';

        return (
          <section
            key={family.id}
            className="border-b border-border pb-4"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-left text-foreground transition-colors hover:text-primary"
              aria-expanded={isOpen}
              aria-controls={`products-${family.id}`}
              onClick={() =>
                setOpenGroups((current) => ({
                  ...current,
                  [family.id]: !isOpen,
                }))
              }
            >
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {image ? (
                  <Image
                    src={image}
                    alt={family.label}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PackageOpen className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{family.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    {groupProducts.length} option
                    {groupProducts.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground md:max-w-2xl">
                  {family.description}
                </p>
              </div>

              <ChevronDown
                className={cn(
                  'h-5 w-5 flex-shrink-0 text-primary transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {isOpen && (
              <div id={`products-${family.id}`} className="pt-2">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {groupProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
