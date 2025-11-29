import { Product } from '../../utils/products';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  highlightedProductId?: number | null;
}

export default function ProductGrid({ products, onAddToCart, highlightedProductId }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          highlighted={highlightedProductId === product.id}
        />
      ))}
    </div>
  );
}

