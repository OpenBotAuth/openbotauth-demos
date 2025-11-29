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
    
    // Parse quantity - handle both numbers and text like "one", "two", etc.
    let quantity = 1;
    const quantityInput = req.body.quantity;
    if (quantityInput) {
      const textToNumber: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
      };
      const lowerQuantity = String(quantityInput).toLowerCase().trim();
      quantity = textToNumber[lowerQuantity] || parseInt(quantityInput, 10) || 1;
    }
    
    console.log(`[ElevenLabs Cart Webhook] Adding item: ${item_name}, quantity: ${quantity}, session: ${sessionId}`);

    // Map product names to prices
    const productPrices: Record<string, number> = {
      'Classic White Shirt': 89,
      'classic white shirt': 89,
      'white shirt': 89,
      'Denim Jacket': 149,
      'denim jacket': 149,
      'Black Trousers': 129,
      'black trousers': 129,
      'trousers': 129,
      'Leather Boots': 199,
      'leather boots': 199,
      'boots': 199,
      'Navy Blazer': 249,
      'navy blazer': 249,
      'blazer': 249,
      'Burgundy Polo Shirt': 79,
      'burgundy polo shirt': 79,
      'polo shirt': 79,
      'Tan Chinos': 119,
      'tan chinos': 119,
      'chinos': 119,
      'Black Dress Shoes': 199,
      'black dress shoes': 199,
      'dress shoes': 199,
      'Dark Denim': 129,
      'dark denim': 129,
      'denim': 129,
    };

    // Find the price based on item name (case-insensitive partial match)
    let price = 99; // Default price
    const lowerItemName = item_name?.toLowerCase() || '';
    for (const [productName, productPrice] of Object.entries(productPrices)) {
      if (lowerItemName.includes(productName.toLowerCase())) {
        price = productPrice;
        break;
      }
    }

    // Add item to cart
    const cart = CartManager.addItem(sessionId, {
      id: Date.now(),
      name: item_name,
      price: price,
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

    // Step 1: Record consent with timestamp
    StepEmitter.emitStepStart('record-consent', 'payment', { 
      consentId: consent.consentId,
      timestamp: consent.timestamp 
    });
    await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay
    StepEmitter.emitStepComplete('record-consent', 'payment', { 
      consent: consent.transcript 
    });

    // Step 2: Request ID token from Visa
    StepEmitter.emitStepStart('request-id-token', 'payment', { 
      user: user_identifier 
    });
    await new Promise(resolve => setTimeout(resolve, 800)); // Visual delay
    const mockIdToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({
      sub: user_identifier,
      iss: 'visa-mock',
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64')}`;
    StepEmitter.emitStepComplete('request-id-token', 'payment', { 
      idToken: mockIdToken.substring(0, 50) + '...' 
    });

    // Step 3: Generate nonce and timestamps
    StepEmitter.emitStepStart('generate-nonce', 'payment');
    await new Promise(resolve => setTimeout(resolve, 400)); // Visual delay
    StepEmitter.emitStepComplete('generate-nonce', 'payment', {
      nonce: session.nonce.substring(0, 16) + '...',
      created: session.created,
      expires: session.expires
    });

    // Step 4: Build TAP objects
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

    // Step 5: Sign the message with RFC 9421
    StepEmitter.emitStepStart('sign-message', 'payment');
    await new Promise(resolve => setTimeout(resolve, 600)); // Visual delay
    
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

    StepEmitter.emitStepComplete('sign-message', 'payment', {
      algorithm: 'Ed25519',
      keyId: config.obaKid
    });

    // Step 6: Send signed request to merchant
    StepEmitter.emitStepStart('send-signed-request', 'payment', { 
      method: 'POST',
      url: '/merchant/checkout'
    });

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
    
    StepEmitter.emitStepComplete('send-signed-request', 'payment', {
      status: merchantResponse.status,
      orderId: result.orderId
    });
    
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
