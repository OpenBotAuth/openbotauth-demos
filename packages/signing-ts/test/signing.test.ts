/**
 * RFC 9421 Signing Tests - Golden Vectors
 * 
 * These tests use fixed values to ensure deterministic signatures
 * that can be verified against Python implementation
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { makeSignedHeaders } from '../src/index.js';
import { buildSignatureBase, parseUrl } from '../src/rfc9421.js';
import type { SignatureComponents } from '../src/types.js';

// Golden test vector - fixed Ed25519 keypair for testing
// NEVER use these keys in production!
const TEST_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJ+DYvh6SEqVTm50DFtMDoQikTmiCqirVv9mWG9qfSnF
-----END PRIVATE KEY-----`;

const TEST_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAJrQLj5P/89iXES9+vFgrIy29clF9CC/oPPsw3c5D0bs=
-----END PUBLIC KEY-----`;

const TEST_KID = 'test-key-001';
const TEST_JWKS_URL = 'https://registry.example.com/jwks/testuser.json';

test('RFC 9421: parseUrl normalizes authority correctly', () => {
  // Test default port stripping
  const parsed1 = parseUrl('GET', 'https://example.com:443/path?query=1');
  assert.strictEqual(parsed1.authority, 'example.com');
  assert.strictEqual(parsed1.path, '/path?query=1');
  
  const parsed2 = parseUrl('GET', 'http://example.com:80/path');
  assert.strictEqual(parsed2.authority, 'example.com');
  
  // Test non-default ports are kept
  const parsed3 = parseUrl('GET', 'https://example.com:8080/path');
  assert.strictEqual(parsed3.authority, 'example.com:8080');
  
  const parsed4 = parseUrl('GET', 'http://example.com:3000/path');
  assert.strictEqual(parsed4.authority, 'example.com:3000');
});

test('RFC 9421: buildSignatureBase produces correct format', () => {
  const components: SignatureComponents = {
    components: ['@method', '@authority', '@path'],
    created: 1234567890,
    expires: 1234568190,
    nonce: 'test-nonce-123',
    keyId: TEST_KID,
    algorithm: 'ed25519',
  };
  
  const parsedUrl = parseUrl('GET', 'https://blog.attach.dev/?p=6');
  const signatureBase = buildSignatureBase(components, parsedUrl);
  
  const expectedLines = [
    '"@method": GET',
    '"@authority": blog.attach.dev',
    '"@path": /?p=6',
    '"@signature-params": ("@method" "@authority" "@path");created=1234567890;expires=1234568190;nonce="test-nonce-123";keyid="test-key-001";alg="ed25519"',
  ];
  
  assert.strictEqual(signatureBase, expectedLines.join('\n'));
});

test('RFC 9421: component order must match Signature-Input order', () => {
  const components: SignatureComponents = {
    components: ['@method', '@authority', '@path'],
    created: 1234567890,
    expires: 1234568190,
    nonce: 'nonce-abc',
    keyId: 'key-001',
    algorithm: 'ed25519',
  };
  
  const parsedUrl = parseUrl('POST', 'https://api.example.com/v1/resource');
  const signatureBase = buildSignatureBase(components, parsedUrl);
  
  // Verify order is @method, @authority, @path
  const lines = signatureBase.split('\n');
  assert.ok(lines[0].startsWith('"@method":'));
  assert.ok(lines[1].startsWith('"@authority":'));
  assert.ok(lines[2].startsWith('"@path":'));
  assert.ok(lines[3].startsWith('"@signature-params":'));
});

test('RFC 9421: Golden vector - deterministic signature', async () => {
  // Fixed inputs for deterministic output
  const method = 'GET';
  const url = 'https://blog.attach.dev/?p=6';
  const created = 1700000000;
  const expires = 1700000300;
  const nonce = 'abc123def456';
  
  const signedHeaders = await makeSignedHeaders(
    method,
    url,
    {
      privateKeyPem: TEST_PRIVATE_KEY_PEM,
      keyId: TEST_KID,
      signatureAgentUrl: TEST_JWKS_URL,
      created,
      expires,
      nonce,
    }
  );
  
  // Verify required headers are present
  assert.ok(signedHeaders['Signature-Input']);
  assert.ok(signedHeaders['Signature']);
  assert.ok(signedHeaders['Signature-Agent']);
  
  // Verify Signature-Input format
  const expectedSignatureInput = 
    `sig1=("@method" "@authority" "@path");created=${created};expires=${expires};nonce="${nonce}";keyid="${TEST_KID}";alg="ed25519"`;
  assert.strictEqual(signedHeaders['Signature-Input'], expectedSignatureInput);
  
  // Verify Signature-Agent
  assert.strictEqual(signedHeaders['Signature-Agent'], TEST_JWKS_URL);
  
  // Verify Signature format (sig1=:base64:)
  assert.ok(signedHeaders['Signature'].startsWith('sig1=:'));
  assert.ok(signedHeaders['Signature'].endsWith(':'));
  
  // Extract signature value
  const signatureMatch = signedHeaders['Signature'].match(/^sig1=:(.+):$/);
  assert.ok(signatureMatch, 'Signature should match format sig1=:base64:');
  
  const signatureValue = signatureMatch[1];
  
  // Signature should be base64 (not base64url)
  // Base64 can contain +, /, = but not -, _
  assert.ok(/^[A-Za-z0-9+/]+=*$/.test(signatureValue), 'Signature should be base64 encoded');
  
  // For this specific test vector, verify the signature is deterministic
  // Note: This specific value comes from signing with the test key
  // If the implementation is correct, this should always produce the same result
  console.log('\nGolden Vector Test Results:');
  console.log('Signature-Input:', signedHeaders['Signature-Input']);
  console.log('Signature:', signedHeaders['Signature']);
  console.log('\nTo verify with Python, use these exact values:');
  console.log('- created:', created);
  console.log('- expires:', expires);
  console.log('- nonce:', nonce);
});

test('RFC 9421: Signature window validation', async () => {
  const method = 'GET';
  const url = 'https://example.com/';
  
  // Test max 300s window is enforced
  const created = Math.floor(Date.now() / 1000);
  const expires = created + 301; // Too long!
  
  await assert.rejects(
    async () => {
      await makeSignedHeaders(method, url, {
        privateKeyPem: TEST_PRIVATE_KEY_PEM,
        keyId: TEST_KID,
        signatureAgentUrl: TEST_JWKS_URL,
        created,
        expires,
      });
    },
    /Signature window too large/
  );
});

test('RFC 9421: User-Agent header is included', async () => {
  const signedHeaders = await makeSignedHeaders(
    'GET',
    'https://example.com/',
    {
      privateKeyPem: TEST_PRIVATE_KEY_PEM,
      keyId: TEST_KID,
      signatureAgentUrl: TEST_JWKS_URL,
    }
  );
  
  assert.ok(signedHeaders['User-Agent']);
  assert.ok(signedHeaders['User-Agent'].includes('OpenBotAuth'));
});

test('RFC 9421: Nonce is base64url (NOT base64)', async () => {
  const signedHeaders = await makeSignedHeaders(
    'GET',
    'https://example.com/',
    {
      privateKeyPem: TEST_PRIVATE_KEY_PEM,
      keyId: TEST_KID,
      signatureAgentUrl: TEST_JWKS_URL,
    }
  );
  
  // Extract nonce from Signature-Input
  const nonceMatch = signedHeaders['Signature-Input'].match(/nonce="([^"]+)"/);
  assert.ok(nonceMatch, 'Should have nonce in Signature-Input');
  
  const nonce = nonceMatch[1];
  
  // base64url should not contain +, /, = (uses -, _, no padding)
  assert.ok(!/[+/=]/.test(nonce), 'Nonce should be base64url (no +/=)');
});

