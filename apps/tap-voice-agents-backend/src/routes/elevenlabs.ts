import { Router, type Router as RouterType } from 'express';
import crypto from 'crypto';
import { CartManager } from '../services/cart-manager.js';
import { CheckoutManager } from '../services/checkout-manager.js';
import { ConsentManager } from '../services/consent-manager.js';
import { StepEmitter } from '../events/step-emitter.js';
import { buildAgenticConsumer } from '../tap/agenticConsumer.js';
import { buildAgenticPaymentContainer } from '../tap/agenticPaymentContainer.js';
import { makeSignedHeaders } from '@oba-demos/signing-ts';
import { loadConfig } from '../config.js';

const router: RouterType = Router();
const config = loadConfig();

// Cart agent (Pete) webhook - Add to cart
router.post('/cart', async (req, res) => {
  try {
    console.log('[ElevenLabs Cart Webhook] Received:', JSON.stringify(req.body, null, 2));
    
    const sessionId = req.body.session_id || 'demo-session';
    const item_name = req.body.item_name;
    const quantity = req.body.quantity || 1;
    
    console.log(`[ElevenLabs Cart Webhook] Adding item: ${item_name}, quantity: ${quantity}, session: ${sessionId}`);

    // Add item to cart
    const cart = CartManager.addItem(sessionId, {
      id: Date.now(),
      name: item_name,
      price: 99, // Mock price
      quantity: quantity,
    });
    const total = CartManager.getTotal(sessionId);

    console.log(`[ElevenLabs Cart Webhook] Cart updated. Total: $${total}, Items: ${cart.items.length}`);

    // Emit a custom event to notify frontend
    StepEmitter.emit({
      type: 'cart_updated',
      data: {
        items: cart.items,
        total,
        item_count: cart.items.length,
      }
    });

    return res.json({
      message: `Added ${item_name} to your cart. Your total is now $${total}.`,
      cart_total: total,
      item_count: cart.items.length,
    });
  } catch (error) {
    console.error('[ElevenLabs Cart Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// View cart endpoint
router.post('/cart/view', async (req, res) => {
  try {
    console.log('[ElevenLabs Cart Webhook] View cart request');
    const sessionId = req.body.session_id || 'demo-session';
    
    const cart = CartManager.getCart(sessionId);
    const total = CartManager.getTotal(sessionId);

    console.log(`[ElevenLabs Cart Webhook] Cart viewed. Total: $${total}, Items: ${cart.items.length}`);

    // Emit event to open cart panel
    StepEmitter.emit({
      type: 'cart_updated',
      data: {
        items: cart.items,
        total,
        item_count: cart.items.length,
      }
    });

    return res.json({
      message: `You have ${cart.items.length} items in your cart. Total: $${total}.`,
      items: cart.items,
      total,
      item_count: cart.items.length,
    });
  } catch (error) {
    console.error('[ElevenLabs Cart Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to view cart', details: error instanceof Error ? error.message : String(error) });
  }
});

// Initiate checkout endpoint
router.post('/cart/checkout', async (req, res) => {
  try {
    console.log('[ElevenLabs Cart Webhook] Checkout request');
    const sessionId = req.body.session_id || 'demo-session';
    
    const total = CartManager.getTotal(sessionId);
    const checkout = CheckoutManager.initiateCheckout(sessionId, total);

    console.log(`[ElevenLabs Cart Webhook] Checkout initiated. ID: ${checkout.checkoutId}, Total: $${total}`);

    // Emit event to notify frontend to switch to Penny
    StepEmitter.emit({
      type: 'checkout_initiated',
      data: {
        checkout_id: checkout.checkoutId,
        total: checkout.total,
      }
    });

    return res.json({
      message: `Checkout initiated for $${total}. I'm connecting you to Penny now. Please wait...`,
      checkout_id: checkout.checkoutId,
      total: checkout.total,
      action: 'handoff_to_penny',
    });
  } catch (error) {
    console.error('[ElevenLabs Cart Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to initiate checkout', details: error instanceof Error ? error.message : String(error) });
  }
});

// Payment agent (Penny) webhook - Get checkout info
router.post('/payment/info', async (req, res) => {
  try {
    console.log('[ElevenLabs Payment Webhook] Get checkout info request');
    
    // Always use demo-session for simplicity
    const sessionId = 'demo-session';
    const total = CartManager.getTotal(sessionId);
    const cart = CartManager.getCart(sessionId);
    
    console.log(`[ElevenLabs Payment Webhook] Checkout info: Total=$${total}, Items=${cart.items.length}`);

    return res.json({
      message: `The checkout total is $${total} for ${cart.items.length} items.`,
      total,
      items: cart.items,
      item_count: cart.items.length,
    });
  } catch (error) {
    console.error('[ElevenLabs Payment Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to get checkout info', details: error instanceof Error ? error.message : String(error) });
  }
});

// Payment agent (Penny) webhook - Capture consent
router.post('/payment/consent', async (req, res) => {
  try {
    console.log('[ElevenLabs Payment Webhook] Capture consent request:', JSON.stringify(req.body, null, 2));
    
    const { transcript, user_confirmed } = req.body;
    
    // Get checkout from session (demo-session)
    const sessionId = 'demo-session';
    const total = CartManager.getTotal(sessionId);
    
    // Create a checkout if needed
    let checkout = CheckoutManager.initiateCheckout(sessionId, total);
    const checkoutId = checkout.checkoutId;

    if (user_confirmed !== 'true' && user_confirmed !== true) {
      return res.json({
        message: 'User did not confirm payment',
      });
    }

    const consent = ConsentManager.captureConsent(checkoutId, transcript);
    CheckoutManager.setConsentId(checkoutId, consent.consentId);

    console.log(`[ElevenLabs Payment Webhook] Consent captured: ${consent.consentId}`);

    // Emit event to close cart panel
    StepEmitter.emit({
      type: 'payment_authorized',
      data: {
        consent_id: consent.consentId,
        checkout_id: checkoutId,
      }
    });

    return res.json({
      message: 'Consent captured successfully. You may now execute the payment.',
      consent_id: consent.consentId,
    });
  } catch (error) {
    console.error('[ElevenLabs Payment Webhook] Consent error:', error);
    res.status(500).json({ error: 'Failed to capture consent', details: error instanceof Error ? error.message : String(error) });
  }
});

// Execute payment endpoint - Triggers the full TAP flow
router.post('/payment/execute', async (req, res) => {
  try {
    console.log('[ElevenLabs Payment Webhook] Execute payment request:', JSON.stringify(req.body, null, 2));
    
    const { payment_token, user_identifier } = req.body;

    // Get checkout ID from session
    const sessionId = 'demo-session';
    const checkout = CheckoutManager.getMostRecentCheckoutBySession(sessionId);
    
    if (!checkout) {
      console.error('[ElevenLabs Payment Webhook] No checkout session found');
      return res.status(400).json({ error: 'No checkout session found' });
    }

    const checkoutId = checkout.checkoutId;
    console.log(`[ElevenLabs Payment Webhook] Executing payment for checkout: ${checkoutId}`);

    // Execute the full TAP payment flow
    const session = CheckoutManager.getCheckoutSession(checkoutId);
    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    const consent = ConsentManager.getConsent(checkoutId);
    if (!consent) {
      return res.status(400).json({ error: 'Consent not captured' });
    }

    StepEmitter.emitStepStart('build-tap-objects', 'payment', { checkoutId });

    // Build TAP objects
    const tokenHash = crypto.createHash('sha256').update(payment_token).digest('hex');
    
    const consumer = await buildAgenticConsumer(
      user_identifier,
      consent.consentId,
      session.nonce,
      session.created,
      session.expires,
      config.obaSignatureAgentUrl,
      config.obaPrivateKeyPem
    );

    const payment = await buildAgenticPaymentContainer(
      tokenHash,
      session.total,
      config.mockVisaMerchantId,
      session.nonce,
      session.created,
      session.expires,
      config.obaSignatureAgentUrl,
      config.obaPrivateKeyPem
    );

    StepEmitter.emitStepComplete('build-tap-objects', 'payment', { consumer, payment });

    // Build RFC 9421 signed request
    const merchantUrl = `http://localhost:${config.port}/merchant/checkout`;
    const requestBody = {
      agenticConsumer: consumer,
      agenticPaymentContainer: payment,
    };

    const now = Math.floor(Date.now() / 1000);
    const signedHeaders = await makeSignedHeaders(
      'POST',
      merchantUrl,
      {
        privateKeyPem: config.obaPrivateKeyPem,
        keyId: config.obaKid,
        signatureAgentUrl: config.obaSignatureAgentUrl,
        created: now,
        expires: now + 300,
      }
    );

    StepEmitter.emitStepStart('send-signed-request', 'payment', { merchantUrl });

    // Send signed request to merchant
    const merchantResponse = await fetch(merchantUrl, {
      method: 'POST',
      headers: {
        ...signedHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!merchantResponse.ok) {
      throw new Error(`Merchant returned ${merchantResponse.status}`);
    }

    const result = await merchantResponse.json() as { orderId: string; transactionId: string };
    
    CheckoutManager.updateStatus(checkoutId, 'completed');

    console.log('[ElevenLabs Payment Webhook] Payment completed:', result);

    return res.json({
      message: 'Perfect! Your payment has been processed. Thank you!',
      order_id: result.orderId,
      transaction_id: result.transactionId,
    });
  } catch (error) {
    console.error('[ElevenLabs Payment Webhook] Payment error:', error);
    StepEmitter.emitStepError('execute-payment', 'payment', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to execute payment', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
