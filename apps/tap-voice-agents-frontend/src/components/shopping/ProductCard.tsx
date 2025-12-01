import { Product } from '../../utils/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  highlighted?: boolean;
}

export default function ProductCard({ product, onAddToCart, highlighted }: ProductCardProps) {
  return (
    <div className={`product-card ${highlighted ? 'border-accent border-2' : ''}`}>
      <img 
        src={product.image} 
        alt={product.name}
        className="product-card-image"
        onError={(e) => {
          // Fallback to a colored placeholder if image fails to load
          e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Crect width='240' height='240' fill='%2316213e'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter' font-size='20' fill='%2394a3b8'%3E${product.category}%3C/text%3E%3C/svg%3E`;
        }}
      />
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{product.category}</p>
          <h3 className="text-lg font-semibold text-slate-100 mt-1">{product.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{product.description}</p>
        </div>
        <div className="flex flex-col space-y-3">
          <span className="text-2xl font-bold text-slate-100">${product.price}</span>
          <button 
            onClick={() => onAddToCart(product)}
            className="product-card-add-btn w-full"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

