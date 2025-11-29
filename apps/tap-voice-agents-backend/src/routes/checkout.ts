import { Router, type Router as RouterType } from 'express';
import { CheckoutManager } from '../services/checkout-manager.js';
import { CartManager } from '../services/cart-manager.js';
import { ConsentManager } from '../services/consent-manager.js';
import { CheckoutInitiateRequest, ConsentCaptureRequest } from '../types.js';

const router: RouterType = Router();

// Initiate checkout
router.post('/initiate', (req, res) => {
  try {
    const { sessionId, userId }: CheckoutInitiateRequest = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const total = CartManager.getTotal(sessionId);
    if (total === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const checkout = CheckoutManager.initiateCheckout(sessionId, total, userId);

    res.json({
      checkoutId: checkout.checkoutId,
      total: checkout.total,
      nonce: checkout.nonce,
      created: checkout.created,
      expires: checkout.expires,
    });
  } catch (error) {
    console.error('Error initiating checkout:', error);
    res.status(500).json({ error: 'Failed to initiate checkout' });
  }
});

// Get checkout session
router.get('/session/:checkoutId', (req, res) => {
  try {
    const { checkoutId } = req.params;
    const session = CheckoutManager.getCheckoutSession(checkoutId);

    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting checkout session:', error);
    res.status(500).json({ error: 'Failed to get checkout session' });
  }
});

// Capture consent
router.post('/consent/capture', (req, res) => {
  try {
    const { checkoutId, transcript, audioHash, timestamp }: ConsentCaptureRequest = req.body;

    if (!checkoutId || !transcript) {
      return res.status(400).json({ error: 'Missing checkoutId or transcript' });
    }

    const session = CheckoutManager.getCheckoutSession(checkoutId);
    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    if (CheckoutManager.isExpired(checkoutId)) {
      return res.status(400).json({ error: 'Checkout session expired' });
    }

    const consent = ConsentManager.captureConsent(checkoutId, transcript, audioHash);
    CheckoutManager.setConsentId(checkoutId, consent.consentId);

    res.json({
      consentId: consent.consentId,
      verified: consent.verified,
    });
  } catch (error) {
    console.error('Error capturing consent:', error);
    res.status(500).json({ error: 'Failed to capture consent' });
  }
});

// Verify consent
router.get('/consent/verify/:checkoutId', (req, res) => {
  try {
    const { checkoutId } = req.params;
    const hasConsent = ConsentManager.hasConsent(checkoutId);
    const consent = ConsentManager.getConsent(checkoutId);

    res.json({
      hasConsent,
      consentId: consent?.consentId,
      timestamp: consent?.timestamp,
    });
  } catch (error) {
    console.error('Error verifying consent:', error);
    res.status(500).json({ error: 'Failed to verify consent' });
  }
});

export default router;

