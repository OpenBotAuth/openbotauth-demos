/**
 * RFC 9421 HTTP Message Signatures - Canonicalization and Signature Base Building
 */

import type { ParsedUrl, SignatureComponents } from './types.js';

/**
 * Parse URL and extract components needed for signing
 * Normalizes authority by removing default ports
 */
export function parseUrl(method: string, url: string): ParsedUrl {
  const urlObj = new URL(url);
  
  // Normalize authority: strip default ports
  let authority = urlObj.host;
  if (
    (urlObj.protocol === 'https:' && urlObj.port === '443') ||
    (urlObj.protocol === 'http:' && urlObj.port === '80')
  ) {
    authority = urlObj.hostname;
  }
  
  // Per RFC 9421, @path is pathname only (NO query string)
  const path = urlObj.pathname || '/';
  
  return {
    method: method.toUpperCase(),
    authority,
    path,
    url,
  };
}

/**
 * Build RFC 9421 signature base string
 * 
 * Format (each component on a new line):
 * "@method": GET
 * "@authority": example.com
 * "@path": /resource
 * "@signature-params": ("@method" "@authority" "@path");created=...;expires=...;nonce="...";keyid="...";alg="ed25519"
 * 
 * Critical: Component order MUST match the order in Signature-Input
 */
export function buildSignatureBase(
  components: SignatureComponents,
  parsedUrl: ParsedUrl,
  headers?: Record<string, string>
): string {
  const lines: string[] = [];
  
  // Process each component in order
  for (const component of components.components) {
    if (component.startsWith('@')) {
      // Derived components (structured fields)
      switch (component) {
        case '@method':
          lines.push(`"@method": ${parsedUrl.method}`);
          break;
        case '@authority':
          lines.push(`"@authority": ${parsedUrl.authority}`);
          break;
        case '@path':
          lines.push(`"@path": ${parsedUrl.path}`);
          break;
        default:
          throw new Error(`Unsupported derived component: ${component}`);
      }
    } else {
      // Regular headers (lowercase)
      const headerValue = headers?.[component.toLowerCase()];
      if (headerValue === undefined) {
        throw new Error(`Header "${component}" not found in request`);
      }
      lines.push(`"${component.toLowerCase()}": ${headerValue}`);
    }
  }
  
  // Add @signature-params line
  const componentList = components.components.map(c => `"${c}"`).join(' ');
  const params = [
    `(${componentList})`,
    `created=${components.created}`,
    `expires=${components.expires}`,
    `nonce="${components.nonce}"`,
    `keyid="${components.keyId}"`,
    `alg="${components.algorithm}"`,
  ].join(';');
  
  lines.push(`"@signature-params": ${params}`);
  
  return lines.join('\n');
}

/**
 * Build Signature-Input header value
 * 
 * Format: sig1=("@method" "@authority" "@path");created=...;expires=...;nonce="...";keyid="...";alg="ed25519"
 */
export function buildSignatureInputHeader(components: SignatureComponents): string {
  const componentList = components.components.map(c => `"${c}"`).join(' ');
  
  return `sig1=(${componentList});created=${components.created};expires=${components.expires};nonce="${components.nonce}";keyid="${components.keyId}";alg="${components.algorithm}"`;
}

/**
 * Build Signature header value
 * 
 * Format: sig1=:base64signature:
 */
export function buildSignatureHeader(signatureBase64: string): string {
  return `sig1=:${signatureBase64}:`;
}

/**
 * Validate signature parameters
 */
export function validateSignatureParams(components: SignatureComponents): void {
  // Enforce max 300s window
  const window = components.expires - components.created;
  if (window > 300) {
    throw new Error(`Signature window too large: ${window}s (max 300s)`);
  }
  
  if (window <= 0) {
    throw new Error('Signature expires must be after created');
  }
  
  if (!components.keyId) {
    throw new Error('Key ID (keyid) is required');
  }
  
  if (!components.nonce) {
    throw new Error('Nonce is required');
  }
  
  if (components.components.length === 0) {
    throw new Error('At least one component must be signed');
  }
}

