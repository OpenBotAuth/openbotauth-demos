/**
 * OpenBotAuth RFC 9421 HTTP Message Signatures (Ed25519)
 * 
 * This package provides signing utilities for HTTP requests compatible with
 * the OpenBotAuth verifier service.
 */

import { generateNonce, signEd25519 } from './ed25519.js';
import {
  parseUrl,
  buildSignatureBase,
  buildSignatureInputHeader,
  buildSignatureHeader,
  validateSignatureParams,
} from './rfc9421.js';
import type { SigningOptions, SignedHeaders, SignatureComponents } from './types.js';

/**
 * Create signed headers for an HTTP request using RFC 9421
 * 
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Full URL to request
 * @param opts - Signing options (keys, kid, etc.)
 * @param headers - Optional request headers to include in signature
 * @returns Headers object with Signature-Input, Signature, and Signature-Agent
 * 
 * @example
 * ```typescript
 * const signedHeaders = await makeSignedHeaders(
 *   'GET',
 *   'https://example.com/resource',
 *   {
 *     privateKeyPem: '-----BEGIN PRIVATE KEY-----...',
 *     keyId: 'my-key-001',
 *     signatureAgentUrl: 'https://registry.example.com/jwks/user.json',
 *   }
 * );
 * 
 * // Use with fetch:
 * const response = await fetch(url, {
 *   method,
 *   headers: signedHeaders,
 * });
 * ```
 */
export async function makeSignedHeaders(
  method: string,
  url: string,
  opts: SigningOptions,
  headers?: Record<string, string>
): Promise<SignedHeaders> {
  // Set defaults
  const now = Math.floor(Date.now() / 1000);
  const created = opts.created ?? now;
  const expires = opts.expires ?? (created + 300); // 5 minutes default
  const nonce = opts.nonce ?? generateNonce();
  
  // Standard components to sign (in this exact order per RFC 9421)
  const components: SignatureComponents = {
    components: ['@method', '@authority', '@path', ...(opts.extraHeaders || [])],
    created,
    expires,
    nonce,
    keyId: opts.keyId,
    algorithm: 'ed25519',
  };
  
  // Validate parameters
  validateSignatureParams(components);
  
  // Parse URL
  const parsedUrl = parseUrl(method, url);
  
  // Build signature base string
  const signatureBase = buildSignatureBase(components, parsedUrl, headers);
  
  // Sign the base string
  const signature = await signEd25519(signatureBase, opts.privateKeyPem);
  
  // Build headers
  const signedHeaders: SignedHeaders = {
    'Signature-Input': buildSignatureInputHeader(components),
    'Signature': buildSignatureHeader(signature),
    'Signature-Agent': opts.signatureAgentUrl,
    'User-Agent': 'OpenBotAuth-Demos/0.1.0',
  };
  
  return signedHeaders;
}

// Re-export types and utilities
export * from './types.js';
export * from './ed25519.js';
export * from './rfc9421.js';

