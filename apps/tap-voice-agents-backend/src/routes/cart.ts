import { Router, type Router as RouterType } from 'express';
import { CartManager } from '../services/cart-manager.js';
import { AddToCartRequest } from '../types.js';

const router: RouterType = Router();

// Add item to cart
router.post('/add', (req, res) => {
  try {
    const { sessionId, item }: AddToCartRequest = req.body;

    if (!sessionId || !item) {
      return res.status(400).json({ error: 'Missing sessionId or item' });
    }

    const cart = CartManager.addItem(sessionId, item);
    const total = CartManager.getTotal(sessionId);

    res.json({
      success: true,
      cart,
      total,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// View cart
router.get('/view', (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const cart = CartManager.getCart(sessionId);
    const total = CartManager.getTotal(sessionId);

    res.json({
      cart,
      total,
    });
  } catch (error) {
    console.error('Error viewing cart:', error);
    res.status(500).json({ error: 'Failed to view cart' });
  }
});

// Clear cart
router.post('/clear', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    CartManager.clearCart(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;

