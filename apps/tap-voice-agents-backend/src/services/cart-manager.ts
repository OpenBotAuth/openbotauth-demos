import { CartState, CartItem } from '../types.js';

// In-memory storage
const carts = new Map<string, CartState>();

export class CartManager {
  static getCart(sessionId: string): CartState {
    if (!carts.has(sessionId)) {
      carts.set(sessionId, {
        sessionId,
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return carts.get(sessionId)!;
  }

  static addItem(sessionId: string, item: { id: number; name: string; price: number; quantity: number }): CartState {
    const cart = this.getCart(sessionId);
    
    // Check if item already exists
    const existingItem = cart.items.find(i => i.id === item.id.toString());
    
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push({
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }
    
    cart.updatedAt = Date.now();
    return cart;
  }

  static removeItem(sessionId: string, itemId: string): CartState {
    const cart = this.getCart(sessionId);
    cart.items = cart.items.filter(item => item.id !== itemId);
    cart.updatedAt = Date.now();
    return cart;
  }

  static clearCart(sessionId: string): void {
    carts.delete(sessionId);
  }

  static getTotal(sessionId: string): number {
    const cart = this.getCart(sessionId);
    return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
}

