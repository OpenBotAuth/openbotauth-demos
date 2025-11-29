import { CartItem as CartItemType } from '../../types';
import CartItem from './CartItem';

interface CartPanelProps {
  items: CartItemType[];
  total: number;
  isOpen: boolean;
  isLocked: boolean;
  isCheckoutPhase?: boolean;
  onRemoveItem?: (productId: number) => void;
  onCheckout?: () => void;
}

export default function CartPanel({ 
  items, 
  total, 
  isOpen, 
  isLocked, 
  isCheckoutPhase = false,
  onRemoveItem,
  onCheckout 
}: CartPanelProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`cart-panel ${isOpen ? 'open' : ''} ${isLocked ? 'locked' : ''} ${isCheckoutPhase ? 'checkout-phase' : ''}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-100">
            {isLocked ? '🛒 Order Summary' : 'Shopping Cart'}
          </h2>
          {!isLocked && (
            <span className="text-sm text-slate-400">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Cart Items */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Your cart is empty</p>
            <p className="text-sm text-slate-500 mt-2">
              Say "Add [item] to cart" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onRemove={onRemoveItem}
                locked={isLocked}
              />
            ))}
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <>
            <div className="border-t border-slate-700 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-300">Total</span>
                <span className="text-2xl font-bold text-slate-100">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            {!isLocked && onCheckout && (
              <button 
                onClick={onCheckout}
                className="btn-primary w-full"
              >
                Proceed to Checkout
              </button>
            )}

            {/* Locked State Info */}
            {isLocked && (
              <div className="text-center">
                <div className="badge badge-info inline-flex">
                  Payment in Progress
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

