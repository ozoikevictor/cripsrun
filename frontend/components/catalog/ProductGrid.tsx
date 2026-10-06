import { ProductCard } from './ProductCard';
import type { ProductDocument } from '@/types/product.types';

interface ProductGridProps {
  products: ProductDocument[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🍃</span>
        </div>
        <h3 className="font-medium text-lg">No products found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or check back soon
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
