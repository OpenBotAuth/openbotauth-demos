import { CartItem as CartItemType } from '../../types';

interface CartItemProps {
  item: CartItemType;
  onRemove?: (productId: number) => void;
  locked?: boolean;
}

export default function CartItem({ item, onRemove, locked }: CartItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
      <img 
        src={item.image} 
        alt={item.name}
        className="w-16 h-16 object-cover rounded"
        onError={(e) => {
          e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%2316213e'/%3E%3C/svg%3E`;
        }}
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-slate-100 truncate">{item.name}</h4>
        <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-100">${item.price * item.quantity}</p>
        {!locked && onRemove && (
          <button 
            onClick={() => onRemove(item.productId)}
            className="text-xs text-red-400 hover:text-red-300 mt-1"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

