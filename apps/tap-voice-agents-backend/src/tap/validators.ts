import crypto from 'crypto';
import { AgenticConsumer, AgenticPaymentContainer } from '../types.js';

export function verifyNonceConsistency(
  signatureInputNonce: string,
  consumer: AgenticConsumer,
  payment: AgenticPaymentContainer
): boolean {
  return (
    signatureInputNonce === consumer.nonce &&
    signatureInputNonce === payment.nonce
  );
}

export function verifyTimestampConsistency(
  signatureCreated: number,
  signatureExpires: number,
  consumer: AgenticConsumer,
  payment: AgenticPaymentContainer
): boolean {
  return (
    signatureCreated === consumer.created &&
    signatureCreated === payment.created &&
    signatureExpires === consumer.expires &&
    signatureExpires === payment.expires
  );
}

export function verifyTimeWindow(created: number, expires: number, maxSeconds: number = 480): boolean {
  const window = expires - created;
  return window > 0 && window <= maxSeconds;
}

export function isExpired(expires: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now > expires;
}

export function verifyObjectSignature(
  prefix: string,
  obj: any,
  signature: string,
  publicKeyPem: string
): boolean {
  try {
    // Create canonical JSON (without signature field)
    const { signature: _, ...unsigned } = obj;
    const canonical = JSON.stringify(unsigned, Object.keys(unsigned).sort());
    const signatureBase = `${prefix}:${canonical}`;

    // Verify with Ed25519 using crypto.verify (not createVerify)
    const signatureBuffer = Buffer.from(signature, 'base64');
    const messageBuffer = Buffer.from(signatureBase, 'utf-8');
    
    return crypto.verify(
      null, // Ed25519 doesn't use a digest algorithm
      messageBuffer,
      publicKeyPem,
      signatureBuffer
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

