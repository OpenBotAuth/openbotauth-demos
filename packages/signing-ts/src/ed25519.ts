/**
 * Ed25519 cryptographic operations using Node's WebCrypto API
 * This matches the bot-cli implementation in OpenBotAuth core
 */

import { webcrypto } from 'node:crypto';

/**
 * Generate a random nonce (base64url-encoded 16 bytes, no padding)
 */
export function generateNonce(): string {
  const bytes = webcrypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Sign a message using Ed25519 private key
 * 
 * Uses Node's WebCrypto API (webcrypto.subtle.sign) which is compatible
 * with the OpenBotAuth verifier service.
 * 
 * @param message - Message to sign (UTF-8 string)
 * @param privateKeyPem - Ed25519 private key in PKCS8 PEM format
 * @returns Signature as base64 string
 */
export async function signEd25519(
  message: string,
  privateKeyPem: string
): Promise<string> {
  try {
    // Import private key from PEM using WebCrypto
    const privateKey = await webcrypto.subtle.importKey(
      'pkcs8',
      pemToBuffer(privateKeyPem),
      {
        name: 'Ed25519',
      },
      false,
      ['sign']
    );

    // Sign the message
    const messageBuffer = new TextEncoder().encode(message);
    const signatureBuffer = await webcrypto.subtle.sign(
      'Ed25519',
      privateKey,
      messageBuffer
    );

    // Return base64-encoded signature
    return Buffer.from(signatureBuffer).toString('base64');
  } catch (error) {
    console.error('Error signing message:', error);
    throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert PEM to ArrayBuffer for WebCrypto
 * 
 * This matches the bot-cli implementation exactly.
 */
function pemToBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Convert base64 to base64url (for encoding other values like nonces)
 */
export function base64ToBase64Url(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64url to base64
 */
export function base64UrlToBase64(base64url: string): string {
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);
  
  return base64;
}
