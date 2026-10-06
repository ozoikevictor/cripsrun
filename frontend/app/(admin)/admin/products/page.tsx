'use client';

import { apiUrl } from '@/lib/api';


import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Edit, Eye, EyeOff, Wand2 } from 'lucide-react';
import { formatCurrency, formatNaira, formatKg } from '@/lib/utils/format';
import type { ProductDocument, ProductType } from '@/types/product.types';

interface AdminProductForm {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  new_category_name: string;
  product_type: ProductType;
  price_per_kg: number;
  min_kg: number;
  max_kg: number | null;
  kg_increment: number;
  stock_kg: number;
  low_stock_threshold: number;
  image_urls: string;
  is_active: boolean;
  is_featured: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface MarketTemplateItem {
  name: string;
  category: string;
  description: string;
  price_per_kg: number;
  min_kg: number;
  max_kg: number | null;
  kg_increment: number;
  stock_kg: number;
  product_type: ProductType;
  tags: string[];
  image_url?: string;
}

const MARKET_TEMPLATES: Record<string, { label: string; items: MarketTemplateItem[] }> = {
  chicken: {
    label: 'Chicken parts',
    items: [
      { name: 'Chicken Breast', category: 'Chicken', description: 'Fresh chicken breast, packed by weight.', price_per_kg: 6500, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 30, product_type: 'PERISHABLE', tags: ['chicken', 'breast', 'protein'] },
      { name: 'Chicken Lap', category: 'Chicken', description: 'Fresh chicken lap pieces for stew, grilling, or frying.', price_per_kg: 5800, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 30, product_type: 'PERISHABLE', tags: ['chicken', 'lap', 'protein'] },
      { name: 'Half Chicken', category: 'Chicken', description: 'Half chicken portion, cleaned and ready to cook.', price_per_kg: 5200, min_kg: 0.5, max_kg: 6, kg_increment: 0.5, stock_kg: 20, product_type: 'PERISHABLE', tags: ['chicken', 'half chicken'] },
      { name: 'Whole Chicken', category: 'Chicken', description: 'Whole chicken, fresh and cleaned.', price_per_kg: 4500, min_kg: 1, max_kg: 8, kg_increment: 0.5, stock_kg: 25, product_type: 'PERISHABLE', tags: ['chicken', 'whole chicken'] },
    ],
  },
  goat: {
    label: 'Goat parts',
    items: [
      { name: 'Goat Meat Mixed Cuts', category: 'Goat', description: 'Fresh goat meat mixed cuts by weight.', price_per_kg: 7500, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 25, product_type: 'PERISHABLE', tags: ['goat', 'meat'] },
      { name: 'Goat Leg', category: 'Goat', description: 'Goat leg cut and packed by weight.', price_per_kg: 8200, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 15, product_type: 'PERISHABLE', tags: ['goat', 'leg'] },
      { name: 'Goat Head', category: 'Goat', description: 'Goat head pieces, cleaned and packed.', price_per_kg: 6500, min_kg: 1, max_kg: 6, kg_increment: 0.5, stock_kg: 10, product_type: 'PERISHABLE', tags: ['goat', 'head'], image_url: '/images/goat-head-market.png' },
      { name: 'Goat Offals', category: 'Goat', description: 'Goat offals for pepper soup and local dishes.', price_per_kg: 5200, min_kg: 0.5, max_kg: 8, kg_increment: 0.5, stock_kg: 12, product_type: 'PERISHABLE', tags: ['goat', 'offals'] },
    ],
  },
  fish: {
    label: 'Fish section',
    items: [
      { name: 'Fresh Fish', category: 'Fish & Seafood', description: 'Fresh fish packed by weight for stew and grilling.', price_per_kg: 5000, min_kg: 1, max_kg: 15, kg_increment: 0.5, stock_kg: 45, product_type: 'PERISHABLE', tags: ['fish', 'fresh fish'], image_url: '/images/fresh-tilapia.png' },
      { name: 'Catfish', category: 'Fish & Seafood', description: 'Fresh catfish packed by weight.', price_per_kg: 5200, min_kg: 1, max_kg: 15, kg_increment: 0.5, stock_kg: 40, product_type: 'PERISHABLE', tags: ['fish', 'catfish'], image_url: '/images/catfish-market.png' },
      { name: 'Dry Fish', category: 'Dry Fish', description: 'Dry fish for soups, stew, and local dishes.', price_per_kg: 7000, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 25, product_type: 'REGULAR', tags: ['dry fish', 'dried fish'], image_url: '/images/dry-fish-head-market.png' },
      { name: 'Stock Fish', category: 'Dry Fish', description: 'Stock fish for soup and traditional meals.', price_per_kg: 12000, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 20, product_type: 'REGULAR', tags: ['stock fish', 'stockfish', 'dried fish'], image_url: '/images/dry-fish-head-market.png' },
    ],
  },
  rice: {
    label: 'Rice measures',
    items: [
      { name: 'Rice Full Bag', category: 'Rice', description: 'Full bag of rice for family or bulk purchase.', price_per_kg: 1800, min_kg: 25, max_kg: 50, kg_increment: 25, stock_kg: 300, product_type: 'REGULAR', tags: ['rice', 'bag'] },
      { name: 'Rice Half Bag', category: 'Rice', description: 'Half bag of rice.', price_per_kg: 1850, min_kg: 12.5, max_kg: 25, kg_increment: 12.5, stock_kg: 200, product_type: 'REGULAR', tags: ['rice', 'half bag'] },
      { name: 'Rice Paint', category: 'Rice', description: 'Rice sold by paint measure.', price_per_kg: 2000, min_kg: 3, max_kg: 30, kg_increment: 3, stock_kg: 150, product_type: 'REGULAR', tags: ['rice', 'paint'] },
      { name: 'Rice Small Measure', category: 'Rice', description: 'Small rice measure for quick cooking needs.', price_per_kg: 2200, min_kg: 1, max_kg: 20, kg_increment: 1, stock_kg: 100, product_type: 'REGULAR', tags: ['rice', 'small measure'] },
      { name: 'Tomato Aposo Rice Full Bag', category: 'Rice', description: 'Tomato Aposo premium parboiled rice, full bag.', price_per_kg: 1900, min_kg: 25, max_kg: 50, kg_increment: 25, stock_kg: 300, product_type: 'REGULAR', tags: ['rice', 'aposo', 'bag'], image_url: '/images/rice-market.png' },
      { name: 'Tomato Aposo Rice Half Bag', category: 'Rice', description: 'Tomato Aposo premium parboiled rice, half bag.', price_per_kg: 1950, min_kg: 12.5, max_kg: 25, kg_increment: 12.5, stock_kg: 200, product_type: 'REGULAR', tags: ['rice', 'aposo', 'half bag'], image_url: '/images/rice-market.png' },
    ],
  },
  soup: {
    label: 'Soup stuff',
    items: [
      { name: 'Egusi Paint', category: 'Soup Stuff', description: 'Egusi sold by paint measure.', price_per_kg: 6000, min_kg: 1, max_kg: 20, kg_increment: 1, stock_kg: 40, product_type: 'REGULAR', tags: ['soup', 'egusi'] },
      { name: 'Egusi Half Paint', category: 'Soup Stuff', description: 'Half paint egusi measure.', price_per_kg: 6200, min_kg: 0.5, max_kg: 10, kg_increment: 0.5, stock_kg: 30, product_type: 'REGULAR', tags: ['soup', 'egusi', 'half paint'] },
      { name: 'Ogbono Cup', category: 'Soup Stuff', description: 'Ogbono sold by cup measure.', price_per_kg: 9000, min_kg: 0.25, max_kg: 5, kg_increment: 0.25, stock_kg: 20, product_type: 'REGULAR', tags: ['soup', 'ogbono'] },
      { name: 'Crayfish Cup', category: 'Soup Stuff', description: 'Crayfish for soups and sauces.', price_per_kg: 8500, min_kg: 0.25, max_kg: 5, kg_increment: 0.25, stock_kg: 20, product_type: 'REGULAR', tags: ['soup', 'crayfish'] },
      { name: 'Crayfish Paint', category: 'Soup Stuff', description: 'Dried crayfish sold by paint measure.', price_per_kg: 8200, min_kg: 1, max_kg: 10, kg_increment: 1, stock_kg: 35, product_type: 'REGULAR', tags: ['soup', 'crayfish', 'paint'], image_url: '/images/crayfish-market.png' },
    ],
  },
  stew: {
    label: 'Stew items',
    items: [
      { name: 'Tomatoes Basket', category: 'Stew Items', description: 'Fresh tomatoes by basket.', price_per_kg: 1200, min_kg: 10, max_kg: 50, kg_increment: 5, stock_kg: 200, product_type: 'PERISHABLE', tags: ['stew', 'tomatoes', 'basket'], image_url: '/images/tomatoes-basket-market.png' },
      { name: 'Tomatoes Half Basket', category: 'Stew Items', description: 'Half basket fresh tomatoes.', price_per_kg: 1300, min_kg: 5, max_kg: 25, kg_increment: 5, stock_kg: 150, product_type: 'PERISHABLE', tags: ['stew', 'tomatoes', 'half basket'], image_url: '/images/tomatoes-basket-market.png' },
      { name: 'Tomatoes Paint', category: 'Stew Items', description: 'Fresh tomatoes sold by paint measure.', price_per_kg: 1400, min_kg: 2, max_kg: 20, kg_increment: 1, stock_kg: 100, product_type: 'PERISHABLE', tags: ['stew', 'tomatoes', 'paint'], image_url: '/images/tomatoes-paint-market.png' },
      { name: 'Fresh Pepper Paint', category: 'Stew Items', description: 'Fresh pepper sold by paint measure.', price_per_kg: 1800, min_kg: 1, max_kg: 20, kg_increment: 1, stock_kg: 80, product_type: 'PERISHABLE', tags: ['stew', 'pepper', 'paint'], image_url: '/images/pepper-paint-market.png' },
      { name: 'Pepper Bag', category: 'Stew Items', description: 'Fresh pepper sold by bag.', price_per_kg: 1700, min_kg: 10, max_kg: 60, kg_increment: 5, stock_kg: 150, product_type: 'PERISHABLE', tags: ['stew', 'pepper', 'bag'], image_url: '/images/pepper-bag-market.png' },
      { name: 'Pepper Half Tier', category: 'Stew Items', description: 'Half tier pepper measure for stew and cooking.', price_per_kg: 1750, min_kg: 5, max_kg: 30, kg_increment: 5, stock_kg: 90, product_type: 'PERISHABLE', tags: ['stew', 'pepper', 'half tier'], image_url: '/images/pepper-bag-market.png' },
      { name: 'Onions Bag', category: 'Stew Items', description: 'Onions for stew and cooking.', price_per_kg: 1500, min_kg: 5, max_kg: 50, kg_increment: 5, stock_kg: 120, product_type: 'REGULAR', tags: ['stew', 'onions'] },
    ],
  },
  vegetables: {
    label: 'Vegetables',
    items: [
      { name: 'Carrots', category: 'Vegetables', description: 'Fresh carrots packed for cooking, salads, and stews.', price_per_kg: 1800, min_kg: 0.5, max_kg: 20, kg_increment: 0.5, stock_kg: 80, product_type: 'PERISHABLE', tags: ['vegetables', 'carrots'], image_url: '/images/carrots-market.png' },
      { name: 'Green Pepper', category: 'Vegetables', description: 'Fresh green pepper for stew, sauce, and cooking.', price_per_kg: 2200, min_kg: 0.5, max_kg: 20, kg_increment: 0.5, stock_kg: 60, product_type: 'PERISHABLE', tags: ['vegetables', 'green pepper'], image_url: '/images/green-pepper-market.png' },
      { name: 'Green Beans', category: 'Vegetables', description: 'Fresh green beans for soups, stir fry, and meals.', price_per_kg: 2000, min_kg: 0.5, max_kg: 20, kg_increment: 0.5, stock_kg: 60, product_type: 'PERISHABLE', tags: ['vegetables', 'green beans'], image_url: '/images/green-beans-market.png' },
      { name: 'Cucumber', category: 'Vegetables', description: 'Fresh cucumber for salads and healthy meals.', price_per_kg: 1200, min_kg: 0.5, max_kg: 20, kg_increment: 0.5, stock_kg: 70, product_type: 'PERISHABLE', tags: ['vegetables', 'cucumber'], image_url: '/images/cucumber-market.png' },
      { name: 'Ugu', category: 'Vegetables', description: 'Fresh ugu leaves tied in market bundles.', price_per_kg: 1500, min_kg: 0.5, max_kg: 15, kg_increment: 0.5, stock_kg: 50, product_type: 'PERISHABLE', tags: ['vegetables', 'ugu', 'leaf'], image_url: '/images/ugu-market.png' },
    ],
  },
  tubers: {
    label: 'Yam, potato & plantain',
    items: [
      { name: 'Yam Tuber', category: 'Yam & Plantain', description: 'Fresh yam tuber sold whole, half, or by weight.', price_per_kg: 1600, min_kg: 1, max_kg: 50, kg_increment: 1, stock_kg: 140, product_type: 'REGULAR', tags: ['yam', 'tuber', 'produce'], image_url: '/images/yam-market.png' },
      { name: 'Potato', category: 'Yam & Plantain', description: 'Fresh potatoes packed by weight.', price_per_kg: 1300, min_kg: 1, max_kg: 50, kg_increment: 1, stock_kg: 120, product_type: 'REGULAR', tags: ['potato', 'yam', 'produce'], image_url: '/images/potato-market.png' },
      { name: 'Ripe Plantain', category: 'Yam & Plantain', description: 'Sweet ripe plantain for frying, boiling, or roasting.', price_per_kg: 1500, min_kg: 1, max_kg: 50, kg_increment: 1, stock_kg: 120, product_type: 'PERISHABLE', tags: ['plantain', 'ripe plantain', 'produce'], image_url: '/images/plantain-market.png' },
      { name: 'Unripe Plantain', category: 'Yam & Plantain', description: 'Fresh unripe plantain for porridge, boiling, and healthy meals.', price_per_kg: 1450, min_kg: 1, max_kg: 50, kg_increment: 1, stock_kg: 100, product_type: 'PERISHABLE', tags: ['plantain', 'unripe plantain', 'produce'], image_url: '/images/plantain-market.png' },
      { name: 'Plantain Bunch', category: 'Yam & Plantain', description: 'Full bunch of plantain for family or bulk purchase.', price_per_kg: 1400, min_kg: 5, max_kg: 80, kg_increment: 1, stock_kg: 160, product_type: 'PERISHABLE', tags: ['plantain', 'bunch', 'produce'], image_url: '/images/plantain-market.png' },
      { name: 'Half Bunch Plantain', category: 'Yam & Plantain', description: 'Half bunch of plantain packed for smaller households.', price_per_kg: 1450, min_kg: 2, max_kg: 40, kg_increment: 1, stock_kg: 90, product_type: 'PERISHABLE', tags: ['plantain', 'half bunch', 'produce'], image_url: '/images/plantain-market.png' },
      { name: 'Plantain Fingers', category: 'Yam & Plantain', description: 'Plantain fingers selected and packed by weight.', price_per_kg: 1550, min_kg: 0.5, max_kg: 20, kg_increment: 0.5, stock_kg: 80, product_type: 'PERISHABLE', tags: ['plantain', 'fingers', 'produce'], image_url: '/images/plantain-market.png' },
    ],
  },
  palm: {
    label: 'Palm kernel',
    items: [
      { name: 'Palm Kernel', category: 'Palm Kernel', description: 'Fresh palm kernels for processing and cooking needs.', price_per_kg: 1500, min_kg: 1, max_kg: 100, kg_increment: 1, stock_kg: 150, product_type: 'REGULAR', tags: ['palm kernel', 'pankane'], image_url: '/images/palm-kernel-market.png' },
      { name: 'Palm Oil', category: 'Palm Kernel', description: 'Palm oil in bottle/keg sizes for cooking.', price_per_kg: 3200, min_kg: 1, max_kg: 25, kg_increment: 1, stock_kg: 100, product_type: 'REGULAR', tags: ['palm oil', 'oil', 'palm kernel'], image_url: '/images/palm-oil-market.png' },
    ],
  },
  oil: {
    label: 'Cooking oil',
    items: [
      { name: 'Groundnut Oil', category: 'Oil', description: 'Groundnut oil in bottle/keg sizes for cooking.', price_per_kg: 3800, min_kg: 1, max_kg: 25, kg_increment: 1, stock_kg: 100, product_type: 'REGULAR', tags: ['groundnut oil', 'oil'], image_url: '/images/groundnut-oil-market.png' },
    ],
  },
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const emptyForm: AdminProductForm = {
  name: '',
  slug: '',
  description: '',
  category_id: '',
  new_category_name: '',
  product_type: 'REGULAR',
  price_per_kg: 0,
  min_kg: 0.5,
  max_kg: null,
  kg_increment: 0.5,
  stock_kg: 0,
  low_stock_threshold: 0,
  image_urls: '',
  is_active: true,
  is_featured: false,
};

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminProductForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      setError(null);

      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(apiUrl('/api/admin/products'), { credentials: 'include' }),
          fetch(apiUrl('/api/admin/categories'), { credentials: 'include' }),
        ]);

        const productsJson = await productsRes.json();
        const categoriesJson = await categoriesRes.json();

        if (!productsRes.ok || !productsJson.success) {
          throw new Error(productsJson.error || 'Failed to load products');
        }

        if (!categoriesRes.ok || !categoriesJson.success) {
          throw new Error(categoriesJson.error || 'Failed to load categories');
        }

        setProducts(productsJson.data ?? []);
        setCategories(categoriesJson.data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      }
    }

    loadData();
  }, [refreshKey]);

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (!showInactive && !product.is_active) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [products, search, showInactive]);

  const handleFormChange = (
    field: keyof AdminProductForm,
    value: string | number | boolean | null
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditProduct = (product: ProductDocument) => {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      category_id: product.category_id,
      new_category_name: '',
      product_type: product.product_type,
      price_per_kg: product.price_per_kg,
      min_kg: product.min_kg,
      max_kg: product.max_kg,
      kg_increment: product.kg_increment,
      stock_kg: product.stock_kg,
      low_stock_threshold: product.low_stock_threshold,
      image_urls: product.image_urls.join(', '),
      is_active: product.is_active,
      is_featured: product.is_featured,
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSaving(true);

    try {
      let categoryId = form.category_id;
      const typedCategory = form.new_category_name.trim();
      const matchingCategory = typedCategory
        ? categories.find((category) => category.name.toLowerCase() === typedCategory.toLowerCase())
        : null;

      if (matchingCategory) {
        categoryId = matchingCategory.id;
      } else if (typedCategory) {
        const categorySlug = slugify(typedCategory);

        const existingCategory = categories.find(
          (category) => category.name.toLowerCase() === typedCategory.toLowerCase()
        );

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const categoryRes = await fetch(apiUrl('/api/admin/categories'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: typedCategory,
              slug: categorySlug,
              description: '',
              image_url: null,
              sort_order: categories.length + 1,
            }),
          });

          const categoryJson = await categoryRes.json();
          if (!categoryRes.ok || !categoryJson.success) {
            throw new Error(categoryJson.error || 'Failed to create category');
          }

          categoryId = categoryJson.data.id;
        }
      }

      if (!categoryId) {
        throw new Error('Please select a category or type a new one');
      }

      if (form.price_per_kg <= 0) {
        throw new Error('Please enter a valid price per kg');
      }

      if (form.min_kg <= 0) {
        throw new Error('Minimum kg must be greater than 0');
      }

      if (form.max_kg !== null && form.max_kg <= 0) {
        throw new Error('Maximum kg must be blank or greater than 0');
      }

      if (form.max_kg !== null && form.max_kg < form.min_kg) {
        throw new Error('Maximum kg must be greater than minimum kg');
      }

      const payload = {
        name: form.name.trim(),
        slug:
          form.slug.trim() ||
          form.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        description: form.description.trim(),
        category_id: categoryId,
        product_type: form.product_type,
        price_per_kg: Math.round(form.price_per_kg),
        min_kg: form.min_kg,
        max_kg: form.max_kg,
        kg_increment: form.kg_increment,
        stock_kg: form.stock_kg,
        low_stock_threshold: form.low_stock_threshold,
        image_urls: form.image_urls
          .split(',')
          .map((url) => url.trim())
          .filter(Boolean),
        is_active: form.is_active,
        is_featured: form.is_featured,
      };

      const method = editingProductId ? 'PUT' : 'POST';
      const url = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products';

      const res = await fetch(apiUrl(url), {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${editingProductId ? 'update' : 'create'} product`);
      }

      setForm(emptyForm);
      setEditingProductId(null);
      setShowForm(false);
      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (product: ProductDocument) => {
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/products/${product.id}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update product status');
      }

      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update product status');
    }
  };

  const ensureCategory = async (categoryName: string) => {
    const existingCategory = categories.find(
      (category) => category.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (existingCategory) return existingCategory.id;

    const categoryRes = await fetch(apiUrl('/api/admin/categories'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: categoryName,
        slug: slugify(categoryName),
        description: '',
        image_url: null,
        sort_order: categories.length + 1,
      }),
    });

    const categoryJson = await categoryRes.json();
    if (!categoryRes.ok || !categoryJson.success) {
      throw new Error(categoryJson.error || `Failed to create ${categoryName} category`);
    }

    return categoryJson.data.id as string;
  };

  const handleCreateTemplate = async (templateKey: string) => {
    const template = MARKET_TEMPLATES[templateKey];
    if (!template) return;

    setError(null);
    setIsBulkSaving(true);

    try {
      const categoryCache = new Map<string, string>();

      for (const item of template.items) {
        const slug = slugify(item.name);
        const alreadyExists = products.some((product) => product.slug === slug);
        if (alreadyExists) continue;

        const categoryId =
          categoryCache.get(item.category) ?? (await ensureCategory(item.category));
        categoryCache.set(item.category, categoryId);

        const payload = {
          name: item.name,
          slug,
          description: item.description,
          category_id: categoryId,
          product_type: item.product_type,
          price_per_kg: item.price_per_kg,
          min_kg: item.min_kg,
          max_kg: item.max_kg,
          kg_increment: item.kg_increment,
          stock_kg: item.stock_kg,
          low_stock_threshold: Math.max(item.min_kg * 2, 1),
          image_urls: [item.image_url ?? `/images/${slug}.png`],
          is_active: true,
          is_featured: false,
          tags: item.tags,
        };

        const res = await fetch(apiUrl('/api/admin/products'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to create ${item.name}`);
        }
      }

      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create template products');
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage products, inventory, and visibility.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm((current) => !current)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Close Form' : 'Add Product'}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Quick market product sets</h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Create real sellable options like chicken breast, goat head, rice bag,
              crayfish, vegetables, potato, plantain, palm oil, and groundnut oil.
              You can edit prices after creation.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(MARKET_TEMPLATES).map(([key, template]) => (
            <Button
              key={key}
              variant="secondary"
              size="sm"
              onClick={() => handleCreateTemplate(key)}
              disabled={isBulkSaving}
            >
              {isBulkSaving ? 'Creating...' : `Add ${template.label}`}
            </Button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-slug">Slug</Label>
              <Input
                id="product-slug"
                value={form.slug}
                onChange={(e) => handleFormChange('slug', e.target.value)}
                placeholder="product-slug"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <textarea
                id="product-description"
                className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={form.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category</Label>
              <Input
                id="new-category-name"
                list="product-category-options"
                value={form.new_category_name}
                onChange={(e) => {
                  const categoryName = e.target.value;
                  const selectedCategory = categories.find(
                    (category) => category.name.toLowerCase() === categoryName.trim().toLowerCase()
                  );
                  handleFormChange('new_category_name', categoryName);
                  handleFormChange('category_id', selectedCategory?.id ?? '');
                }}
                placeholder="Type category, e.g. Beef, Chicken, Turkey"
              />
              <datalist id="product-category-options">
                {categories.map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Type a category or choose one from suggestions. New categories are saved automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-type">Product Type</Label>
              <select
                id="product-type"
                className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={form.product_type}
                onChange={(e) => handleFormChange('product_type', e.target.value as ProductType)}
              >
                <option value="REGULAR">REGULAR</option>
                <option value="PERISHABLE">PERISHABLE</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-per-kg">Price per kg (NGN)</Label>
              <Input
                  id="price-per-kg"
                  type="text"
                  inputMode="decimal"
                  value={form.price_per_kg || ''}
                  onChange={(e) => handleFormChange('price_per_kg', e.target.value === '' ? 0 : Number(e.target.value.replace(/[^0-9.]/g, '')))}
                  placeholder="Type price, e.g. 12500"
                />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-kg">Min kg</Label>
              <Input
                id="min-kg"
                type="number"
                step={0.1}
                value={form.min_kg}
                onChange={(e) => handleFormChange('min_kg', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-kg">Max kg</Label>
              <Input
                id="max-kg"
                type="number"
                step={0.1}
                value={form.max_kg ?? ''}
                onChange={(e) => handleFormChange('max_kg', e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kg-increment">Kg increment</Label>
              <Input
                id="kg-increment"
                type="number"
                step={0.1}
                value={form.kg_increment}
                onChange={(e) => handleFormChange('kg_increment', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-kg">Stock kg</Label>
              <Input
                id="stock-kg"
                type="number"
                step={0.1}
                value={form.stock_kg}
                onChange={(e) => handleFormChange('stock_kg', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="low-stock-threshold">Low stock threshold</Label>
              <Input
                id="low-stock-threshold"
                type="number"
                step={0.1}
                value={form.low_stock_threshold}
                onChange={(e) => handleFormChange('low_stock_threshold', Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="image-urls">Image paths or URLs</Label>
              <Input
                id="image-urls"
                value={form.image_urls}
                onChange={(e) => handleFormChange('image_urls', e.target.value)}
                placeholder="/images/chicken-breast.png, /images/fresh-tilapia.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is-active">Active</Label>
              <div className="flex items-center gap-2">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => handleFormChange('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Available for purchase</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is-featured">Featured</Label>
              <div className="flex items-center gap-2">
                <input
                  id="is-featured"
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => handleFormChange('is_featured', e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Show as featured</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingProductId ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="admin-product-search"
            className="pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showInactive ? 'outline' : 'secondary'}
          size="sm"
          onClick={() => setShowInactive((current) => !current)}
        >
          {showInactive ? (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Show Active Only
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Show All
            </>
          )}
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Price/kg</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Stock</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Min kg</th>
                <th className="p-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-center font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const isLowStock = product.stock_kg <= product.low_stock_threshold;
                const categoryName =
                  categories.find((cat) => cat.id === product.category_id)?.name ||
                  'Uncategorized';

                return (
                  <tr
                    key={product.id}
                    className={`border-t hover:bg-muted/30 transition-colors ${
                      !product.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3">{categoryName}</td>
                    <td className="p-3 text-right">{formatNaira(product.price_per_kg)}</td>
                    <td className="p-3 text-right">
                      <span className={isLowStock ? 'text-red-500 font-medium' : ''}>
                        {formatKg(product.stock_kg)}
                      </span>
                      {isLowStock && <span className="text-xs text-red-500 block">Low stock</span>}
                    </td>
                    <td className="p-3 text-right">{formatKg(product.min_kg)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={product.is_active ? 'success' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(product)}
                      >
                        {product.is_active ? (
                          <EyeOff className="h-4 w-4 text-red-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
