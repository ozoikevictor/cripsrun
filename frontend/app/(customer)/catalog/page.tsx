"use client";

import { apiUrl } from '@/lib/api';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  PackageCheck,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountAction } from '@/components/auth/AccountAction';
import { CategoryTabs } from '@/components/catalog/CategoryTabs';
import { ProductGroupGrid } from '@/components/catalog/ProductGroupGrid';
import type {
  CategoryDocument,
  ProductDocument,
} from '@/types/product.types';

const DEMO_CATEGORIES: CategoryDocument[] = [
  {
    id: 'cat-beef',
    name: 'Beef',
    slug: 'beef',
    description: 'Fresh cuts of beef',
    image_url: null,
    is_active: true,
    sort_order: 1,
    created_at: null as any,
  },
  {
    id: 'cat-chicken',
    name: 'Chicken',
    slug: 'chicken',
    description: 'Farm-fresh chicken',
    image_url: null,
    is_active: true,
    sort_order: 2,
    created_at: null as any,
  },
  {
    id: 'cat-fish',
    name: 'Fish & Seafood',
    slug: 'fish',
    description: 'Fresh fish and seafood',
    image_url: null,
    is_active: true,
    sort_order: 3,
    created_at: null as any,
  },
  {
    id: 'cat-dry-fish',
    name: 'Dry Fish',
    slug: 'dry-fish',
    description: 'Dry fish, stock fish, and dried fish options',
    image_url: null,
    is_active: true,
    sort_order: 4,
    created_at: null as any,
  },
  {
    id: 'cat-rice-beans',
    name: 'Rice & Beans',
    slug: 'rice-beans',
    description: 'Rice, beans, garri, and dry foodstuff',
    image_url: null,
    is_active: true,
    sort_order: 5,
    created_at: null as any,
  },
  {
    id: 'cat-stew',
    name: 'Stew Items',
    slug: 'stew-items',
    description: 'Tomatoes, pepper, onions, and oil',
    image_url: null,
    is_active: true,
    sort_order: 6,
    created_at: null as any,
  },
  {
    id: 'cat-soup',
    name: 'Soup Items',
    slug: 'soup-items',
    description: 'Crayfish, egusi, ogbono, and soup ingredients',
    image_url: null,
    is_active: true,
    sort_order: 7,
    created_at: null as any,
  },
  {
    id: 'cat-produce',
    name: 'Fresh Produce',
    slug: 'fresh-produce',
    description: 'Vegetables and fresh market produce',
    image_url: null,
    is_active: true,
    sort_order: 8,
    created_at: null as any,
  },
  {
    id: 'cat-yam-plantain',
    name: 'Yam & Plantain',
    slug: 'yam-plantain',
    description: 'Yam, potato, plantain, and tuber options',
    image_url: null,
    is_active: true,
    sort_order: 9,
    created_at: null as any,
  },
  {
    id: 'cat-oil',
    name: 'Oil',
    slug: 'oil',
    description: 'Groundnut oil, palm oil, and cooking oils',
    image_url: null,
    is_active: true,
    sort_order: 10,
    created_at: null as any,
  },
  {
    id: 'cat-palm-kernel',
    name: 'Palm Kernel',
    slug: 'palm-kernel',
    description: 'Palm kernel and palm produce',
    image_url: null,
    is_active: true,
    sort_order: 11,
    created_at: null as any,
  },
  {
    id: 'cat-flour',
    name: 'Flour & Baking',
    slug: 'flour',
    description: 'Flour and baking essentials',
    image_url: null,
    is_active: true,
    sort_order: 12,
    created_at: null as any,
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cat-beef': ['beef', 'steak', 'goat', 'shaki', 'tripe', 'cow', 'meat'],
  'cat-chicken': ['chicken', 'hen', 'turkey', 'poultry'],
  'cat-fish': ['fish', 'tilapia', 'prawn', 'seafood', 'catfish', 'croaker', 'shrimp'],
  'cat-dry-fish': ['dry fish', 'stockfish', 'stock fish', 'dried fish'],
  'cat-rice-beans': ['rice', 'beans', 'garri', 'gari', 'granos', 'aposo'],
  'cat-stew': ['tomato', 'tomatoes', 'pepper', 'onion', 'onions', 'stew'],
  'cat-soup': ['crayfish', 'egusi', 'ogbono', 'soup'],
  'cat-produce': ['vegetable', 'vegetables', 'okra', 'leaf', 'leaves', 'carrot', 'green pepper', 'green beans', 'cucumber', 'ugu'],
  'cat-yam-plantain': ['yam', 'tuber', 'potato', 'plantain'],
  'cat-oil': ['oil', 'groundnut oil'],
  'cat-palm-kernel': ['palm kernel', 'pankane', 'palm oil', 'palm nut'],
  'cat-flour': ['flour', 'semolina', 'wheat', 'baking', 'yam flour', 'plantain flour'],
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasKeyword(searchable: string, keyword: string) {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, 'i');
  return pattern.test(searchable);
}

function productMatchesCategory(product: ProductDocument, categoryId: string) {
  if (product.category_id === categoryId) return true;

  const searchable = [
    product.name,
    product.slug,
    product.description,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ]
    .join(' ')
    .toLowerCase();

  return CATEGORY_KEYWORDS[categoryId]?.some((keyword) => hasKeyword(searchable, keyword));
}

export default function CatalogPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    let productsLocal = products.slice();

    if (activeCategory) {
      productsLocal = productsLocal.filter((product) =>
        productMatchesCategory(product, activeCategory)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      productsLocal = productsLocal.filter((product) =>
        [
          product.name,
          product.slug,
          product.description,
          ...(Array.isArray(product.tags) ? product.tags : []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    return productsLocal;
  }, [activeCategory, searchQuery, products]);

  const categoryCounts = useMemo(() => {
    return DEMO_CATEGORIES.reduce<Record<string, number>>((acc, category) => {
      acc[category.id] = products.filter((product) =>
        productMatchesCategory(product, category.id)
      ).length;
      return acc;
    }, {});
  }, [products]);

  const featuredProduct =
    products.find((product) => product.is_featured) ?? products[0];
  const activeCategoryName =
    DEMO_CATEGORIES.find((category) => category.id === activeCategory)?.name ??
    'All fresh products';

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    fetch(apiUrl('/api/products'))
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (!json?.success) {
          setError(json?.error ?? 'Failed to load products');
          setProducts([]);
        } else {
          setProducts(json.data ?? []);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load products');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="text-white">
      <section className="border-b border-white/10 bg-white/[0.03]">
        <div className="container grid gap-8 py-8 md:grid-cols-[1.25fr_0.75fr] md:py-12 lg:py-14">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Lagos fresh market</Badge>
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" />
                Packed today
              </Badge>
            </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Shop all fresh foodstuff
              </h1>
              <p className="mt-3 max-w-2xl text-crisp-100/80 md:text-lg">
                Browse beef, chicken, rice, oil, yam, plantain, vegetables,
                dry fish, and soup ingredients. Open each section to choose the
                exact part, size, or market measure you want.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-l-2 border-crisp-400 bg-white/10 p-4 shadow-sm backdrop-blur">
                <PackageCheck className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Market packed</p>
                <p className="text-xs text-crisp-100/70">
                  Items are grouped like a real foodstuff store.
                </p>
              </div>
              <div className="border-l-2 border-crisp-400 bg-white/10 p-4 shadow-sm backdrop-blur">
                <Truck className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Scheduled delivery</p>
                <p className="text-xs text-crisp-100/70">
                  Choose the best day at checkout.
                </p>
              </div>
              <div className="border-l-2 border-crisp-400 bg-white/10 p-4 shadow-sm backdrop-blur">
                <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Quality checked</p>
                <p className="text-xs text-crisp-100/70">
                  Fresh products before dispatch.
                </p>
              </div>
            </div>
          </div>
          </div>

          <div className="hidden min-h-[320px] bg-[#020b07] p-6 text-white shadow-xl md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-medium text-crisp-200">Today&apos;s shelf</p>
              <h2 className="mt-2 text-2xl font-bold">
              {featuredProduct?.name ?? 'Fresh products'}
              </h2>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-crisp-100">
                {featuredProduct
                  ? featuredProduct.description
                  : 'Load your store products and they will appear here automatically.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-crisp-200">
                  Items
                </p>
                <p className="mt-1 text-3xl font-bold">{products.length}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-crisp-200">
                  Delivery
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <Clock className="h-4 w-4" />
                  Today
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-8 py-8 md:py-10">
        <section className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-crisp-300">
                Shop all
              </p>
              <h2 className="text-2xl font-bold md:text-3xl">{activeCategoryName}</h2>
              <p className="text-sm text-crisp-100/70">
                {filteredProducts.length} item
                {filteredProducts.length === 1 ? '' : 's'} ready to browse
              </p>
            </div>

            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="catalog-search"
                placeholder="Search beef, chicken, flour..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-9"
              />
            </div>
          </div>

          <div className="border-b border-white/15 pb-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-crisp-100">
              <SlidersHorizontal className="h-4 w-4" />
              Choose a section
            </div>
            <CategoryTabs
              categories={DEMO_CATEGORIES}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
              counts={categoryCounts}
              totalCount={products.length}
            />
          </div>

          {isLoading ? (
            <div className="site-soft-panel rounded-xl py-16 text-center text-crisp-700">
              Loading fresh products...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 py-16 text-center text-destructive">
              {error}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="site-soft-panel rounded-xl py-16 text-center">
              <h3 className="text-lg font-semibold">No matching products</h3>
              <p className="mt-1 text-sm text-crisp-700">
                Try another category or search for beef, chicken, fish, flour,
                or groceries.
              </p>
            </div>
          ) : (
            <ProductGroupGrid products={filteredProducts} />
          )}
        </section>

      </div>

        <section className="overflow-hidden bg-[#020b07] text-white">
          <div className="border-y border-white/10 bg-white/10 py-3">
            <div className="flex w-max promo-marquee gap-8 whitespace-nowrap text-sm font-semibold uppercase tracking-wide text-crisp-100">
              {[
                'Fresh market delivery across Lagos',
                'Order by kg, paint, cup, bag, or basket',
                'Track your rider after payment',
                'Meat, fish, rice, oil, vegetables, and soup items',
                'Fresh market delivery across Lagos',
                'Order by kg, paint, cup, bag, or basket',
                'Track your rider after payment',
                'Meat, fish, rice, oil, vegetables, and soup items',
              ].map((message, index) => (
                <span key={`${message}-${index}`} className="flex items-center gap-8">
                  {message}
                  <span className="h-2 w-2 rounded-full bg-crisp-300" />
                </span>
              ))}
            </div>
          </div>

          <div className="container grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 p-6 md:p-8 lg:p-10">
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                Moving market advert
              </Badge>
              <div>
                <h2 className="max-w-2xl text-2xl font-bold leading-tight tracking-tight md:text-4xl">
                  Fresh foodstuff packed today, delivered when you need it.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-crisp-100">
                  Order rice, beans, oil, meat, fish, vegetables, and soup
                  ingredients by exact measure. Save your account, track your
                  order, and let CrispRun bring the market to your doorstep.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 p-4">
                  <PackageCheck className="mb-2 h-5 w-5 text-crisp-200" />
                  <p className="text-sm font-semibold">Packed carefully</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <Truck className="mb-2 h-5 w-5 text-crisp-200" />
                  <p className="text-sm font-semibold">Lagos delivery</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <Clock className="mb-2 h-5 w-5 text-crisp-200" />
                  <p className="text-sm font-semibold">Live tracking</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-crisp-950 hover:bg-crisp-50">
                  <Link href="#catalog-search">
                    Start shopping
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <AccountAction className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" />
              </div>
            </div>

            <div className="relative min-h-[260px] bg-crisp-900 md:min-h-full">
              <Image
                src="/images/rice-market.png"
                alt="CrispRun fresh foodstuff delivery"
                fill
                className="object-cover opacity-90"
                sizes="(max-width: 768px) 100vw, 42vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-crisp-950/80 via-crisp-950/10 to-transparent md:bg-gradient-to-r md:from-crisp-950/60 md:to-transparent" />
              <div className="promo-float absolute bottom-5 left-5 right-5 bg-white/95 p-4 text-crisp-950 shadow-xl md:left-6 md:right-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Bulk or small measure
                </p>
                <p className="mt-1 text-lg font-bold">
                  Shop by kg, bag, paint, cup, basket, or exact food part.
                </p>
              </div>
            </div>
          </div>
        </section>
    </div>
  );
}
