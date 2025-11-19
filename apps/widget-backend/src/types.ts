/**
 * Type definitions for widget backend
 */

export interface FetchRequest {
  /** URL to fetch */
  url: string;
  /** Whether to sign the request */
  signed?: boolean;
  /** Extra headers to include */
  extraHeaders?: Record<string, string>;
}

export interface FetchResponse {
  /** HTTP status code */
  status: number;
  /** Response body size in bytes */
  bytes: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Body snippet (first ~400 chars, HTML stripped) */
  bodySnippet: string;
  /** Whether request was signed */
  signed: boolean;
  /** Request details (sanitized) */
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  /** Signature trace (if signed) */
  trace?: {
    created: number;
    expires: number;
    keyId: string;
    signatureInput: string;
  };
  /** Error message (if failed) */
  error?: string;
}

export interface Config {
  port: number;
  privateKeyPem: string;
  keyId: string;
  signatureAgentUrl: string;
  signedDefault: boolean;
}

