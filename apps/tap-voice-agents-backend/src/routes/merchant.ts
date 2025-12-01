import { Router, type Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from '../config.js';
import { OBAVerifier } from '../services/oba-verifier.js';
import { MockVisa } from '../services/mock-visa.js';
import { StepEmitter } from '../events/step-emitter.js';
import { verifyObjectSignature, verifyNonceConsistency, verifyTimestampConsistency, verifyTimeWindow, isExpired } from '../tap/validators.js';

const router: RouterType = Router();
const config = loadConfig();
const verifier = new OBAVerifier(config.obaVerifierUrl);
const mockVisa = new MockVisa(config.mockVisaAlwaysApprove);

// Merchant checkout endpoint (origin server)
router.post('/checkout', async (req, res) => {
  try {
    // Step 1: Receive signed checkout request
    StepEmitter.emitStepStart('merchant-receive', 'verification', { method: req.method, url: req.url });

    const { agenticConsumer, agenticPaymentContainer } = req.body;

    if (!agenticConsumer || !agenticPaymentContainer) {
      return res.status(400).json({ error: 'Missing TAP objects' });
    }

    StepEmitter.emitStepComplete('merchant-receive', 'verification', {
      hasConsumer: !!agenticConsumer,
      hasPayment: !!agenticPaymentContainer
    });

    // Step 2: Verify HTTP signature via OBA verifier
    StepEmitter.emitStepStart('oba-verify-http-sig', 'verification', {
      verifierUrl: 'https://verifier.openbotauth.org/verify',
      signatureAgent: req.headers['signature-agent']
    });

    // Use req.originalUrl to get the full path including the /merchant prefix
    // Express strips the mount path from req.url, but we need the full path for signature verification
    const verifyRequestUrl = `http://localhost:${config.port}${req.originalUrl}`;

    const verifyResult = await verifier.verifySignature({
      method: req.method,
      url: verifyRequestUrl,
      headers: req.headers as Record<string, string>,
    });

    if (!verifyResult.verified) {
      console.error('[Merchant] OBA Verifier rejected signature:', verifyResult.error);
      console.error('[Merchant] Headers sent:', JSON.stringify({
        'signature-input': req.headers['signature-input'],
        'signature': req.headers['signature'],
        'signature-agent': req.headers['signature-agent'],
      }, null, 2));
      StepEmitter.emitStepError('oba-verify-http-sig', 'verification', verifyResult.error || 'Verification failed');
      return res.status(401).json({ error: 'HTTP signature verification failed', details: verifyResult.error });
    }

    StepEmitter.emitStepComplete('oba-verify-http-sig', 'verification', { 
      verified: true,
      agentId: verifyResult.agentId,
      keyId: verifyResult.keyId
    });

    // Step 3: Fetch JWKS to get the public key for TAP signature verification
    StepEmitter.emitStepStart('fetch-jwks', 'verification');
    
    const jwksUrl = req.headers['signature-agent'] as string;
    if (!jwksUrl) {
      throw new Error('Signature-Agent header missing');
    }

    const jwksResponse = await fetch(jwksUrl);
    if (!jwksResponse.ok) {
      throw new Error(`Failed to fetch JWKS from ${jwksUrl}`);
    }

    const jwks = await jwksResponse.json() as { keys: Array<{ kid: string; x: string; kty: string; crv: string }> };
    const keyId = verifyResult.keyId || config.obaKid;
    const jwk = jwks.keys.find(k => k.kid === keyId);
    
    if (!jwk) {
      throw new Error(`Key ${keyId} not found in JWKS`);
    }

    StepEmitter.emitStepComplete('fetch-jwks', 'verification', { keyId });

    // Step 3b: OBA Registry returns JWKS to OBA Verifier
    StepEmitter.emitStepStart('return-jwks', 'verification', { keyId });
    await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay
    StepEmitter.emitStepComplete('return-jwks', 'verification', { publicKey: jwk.x.substring(0, 16) + '...' });

    // Step 3c: OBA Verifier returns verification result to Merchant
    StepEmitter.emitStepStart('return-verification', 'verification', { verified: true });
    await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay
    StepEmitter.emitStepComplete('return-verification', 'verification', { 
      agentId: verifyResult.agentId,
      verified: true 
    });

    // Step 4: Verify TAP object signatures
    StepEmitter.emitStepStart('verify-tap-signatures', 'verification');

    // Convert JWK to PEM format for verification
    // For Ed25519 JWK, the 'x' parameter contains the base64url-encoded 32-byte public key
    const publicKeyBytes = Buffer.from(jwk.x, 'base64url');
    
    // Create SPKI (SubjectPublicKeyInfo) structure for Ed25519
    // OID for Ed25519: 1.3.101.112
    const spkiPrefix = Buffer.from([
      0x30, 0x2a, // SEQUENCE, length 42
      0x30, 0x05, // SEQUENCE, length 5
      0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
      0x03, 0x21, 0x00, // BIT STRING, length 33, no unused bits
    ]);
    
    const spki = Buffer.concat([spkiPrefix, publicKeyBytes]);
    const publicKeyPem = 
      '-----BEGIN PUBLIC KEY-----\n' +
      spki.toString('base64').match(/.{1,64}/g)!.join('\n') +
      '\n-----END PUBLIC KEY-----';

    const consumerValid = verifyObjectSignature(
      'agentic-consumer',
      agenticConsumer,
      agenticConsumer.signature,
      publicKeyPem
    );

    const paymentValid = verifyObjectSignature(
      'agentic-payment',
      agenticPaymentContainer,
      agenticPaymentContainer.signature,
      publicKeyPem
    );

    if (!consumerValid || !paymentValid) {
      StepEmitter.emitStepError('verify-tap-signatures', 'verification', 'TAP signature validation failed');
      return res.status(401).json({ error: 'TAP signature validation failed' });
    }

    // Verify nonce and timestamp consistency
    const nonceValid = verifyNonceConsistency(
      agenticConsumer.nonce, // Using consumer nonce as reference
      agenticConsumer,
      agenticPaymentContainer
    );

    const timestampValid = verifyTimestampConsistency(
      agenticConsumer.created,
      agenticConsumer.expires,
      agenticConsumer,
      agenticPaymentContainer
    );

    if (!nonceValid || !timestampValid) {
      StepEmitter.emitStepError('verify-tap-signatures', 'verification', 'Nonce or timestamp mismatch');
      return res.status(400).json({ error: 'Nonce or timestamp validation failed' });
    }

    if (!verifyTimeWindow(agenticConsumer.created, agenticConsumer.expires)) {
      StepEmitter.emitStepError('verify-tap-signatures', 'verification', 'Invalid time window');
      return res.status(400).json({ error: 'Invalid time window' });
    }

    if (isExpired(agenticConsumer.expires)) {
      StepEmitter.emitStepError('verify-tap-signatures', 'verification', 'Request expired');
      return res.status(400).json({ error: 'Request expired' });
    }

    StepEmitter.emitStepComplete('verify-tap-signatures', 'verification');

    // Step 5: Call Visa for authorization
    StepEmitter.emitStepStart('visa-authorize', 'authorization', { amount: agenticPaymentContainer.amount });

    const visaAuth = await mockVisa.authorize({
      merchantId: agenticPaymentContainer.merchantId,
      amount: agenticPaymentContainer.amount,
      tokenHash: agenticPaymentContainer.tokenHash,
      metadata: {
        userId: agenticConsumer.userId,
        consentId: agenticConsumer.consentProofId,
      },
    });

    if (!visaAuth.approved) {
      StepEmitter.emitStepError('visa-authorize', 'authorization', 'Payment declined');
      return res.status(402).json({ error: 'Payment declined' });
    }

    StepEmitter.emitStepComplete('visa-authorize', 'authorization', visaAuth);

    // Step 6: Send response back to agent
    StepEmitter.emitStepStart('checkout_complete', 'payment');
    
    const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;

    StepEmitter.emitCheckoutComplete(orderId, visaAuth.transactionId);

    res.json({
      success: true,
      orderId,
      transactionId: visaAuth.transactionId,
      authCode: visaAuth.authCode,
    });
  } catch (error) {
    console.error('Merchant checkout error:', error);
    StepEmitter.emitStepError('merchant-checkout', 'verification', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Checkout processing failed' });
  }
});

// Mock Visa endpoint
router.post('/mock-visa/authorize', async (req, res) => {
  try {
    const result = await mockVisa.authorize(req.body);
    res.json(result);
  } catch (error) {
    console.error('Mock Visa error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
});

// SSE events stream
// Note: This is mounted at /api/events, so the full path is /api/events/stream
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  StepEmitter.addClient(res);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
});

export default router;

