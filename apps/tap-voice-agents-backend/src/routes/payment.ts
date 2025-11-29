import { Router, type Router as RouterType } from 'express';
import crypto from 'crypto';
import { CheckoutManager } from '../services/checkout-manager.js';
import { ConsentManager } from '../services/consent-manager.js';
import { buildAgenticConsumer } from '../tap/agenticConsumer.js';
import { buildAgenticPaymentContainer } from '../tap/agenticPaymentContainer.js';
import { makeSignedHeaders } from '@oba-demos/signing-ts';
import { loadConfig } from '../config.js';
import { StepEmitter } from '../events/step-emitter.js';
import { ExecutePaymentRequest } from '../types.js';

const router: RouterType = Router();
const config = loadConfig();

// Execute payment
router.post('/execute', async (req, res) => {
  try {
    const { checkoutId, paymentToken, userIdentifier }: ExecutePaymentRequest = req.body;

    // 1. Verify checkout session
    const session = CheckoutManager.getCheckoutSession(checkoutId);
    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    if (CheckoutManager.isExpired(checkoutId)) {
      return res.status(400).json({ error: 'Checkout session expired' });
    }

    // 2. Verify consent was captured
    if (!ConsentManager.hasConsent(checkoutId)) {
      return res.status(400).json({ error: 'Consent not captured' });
    }

    const consent = ConsentManager.getConsent(checkoutId)!;

    if (!ConsentManager.verifyConsentWindow(checkoutId, config.consentWindowSeconds)) {
      return res.status(400).json({ error: 'Consent window expired' });
    }

    StepEmitter.emitStepStart('build-tap-objects', 'payment', { checkoutId });

    // 3. Build TAP objects
    const tokenHash = crypto.createHash('sha256').update(paymentToken).digest('hex');
    
    const consumer = await buildAgenticConsumer(
      userIdentifier,
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

    // 4. Build RFC 9421 signed request
    const merchantUrl = `http://localhost:${config.port}/merchant/checkout`;
    const requestBody = {
      agenticConsumer: consumer,
      agenticPaymentContainer: payment,
    };

    // Sign the request using RFC 9421 (matching widget-backend pattern)
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

    // 5. Send signed request to merchant
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

    res.json({
      success: true,
      orderId: result.orderId,
      transactionId: result.transactionId,
    });
  } catch (error) {
    console.error('Error executing payment:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    StepEmitter.emitStepError('execute-payment', 'payment', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      error: 'Failed to execute payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

