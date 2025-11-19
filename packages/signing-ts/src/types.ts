/**
 * Type definitions for RFC 9421 HTTP Message Signatures
 */

export interface SigningOptions {
  /** Ed25519 private key in PEM format (PKCS8) */
  privateKeyPem: string;
  /** Key identifier (kid) */
  keyId: string;
  /** JWKS URL for Signature-Agent header */
  signatureAgentUrl: string;
  /** Timestamp for 'created' parameter (default: now) */
  created?: number;
  /** Timestamp for 'expires' parameter (default: created + 300s) */
  expires?: number;
  /** Nonce for replay protection (default: auto-generated) */
  nonce?: string;
  /** Additional headers to include in signature */
  extraHeaders?: string[];
}

export interface SignedHeaders {
  'Signature-Input': string;
  'Signature': string;
  'Signature-Agent': string;
  'User-Agent': string;
  [key: string]: string;
}

export interface SignatureComponents {
  /** List of component names to sign */
  components: string[];
  /** Created timestamp */
  created: number;
  /** Expires timestamp */
  expires: number;
  /** Nonce for replay protection */
  nonce: string;
  /** Key identifier */
  keyId: string;
  /** Signature algorithm */
  algorithm: 'ed25519';
}

export interface ParsedUrl {
  method: string;
  authority: string;
  path: string;
  url: string;
}

