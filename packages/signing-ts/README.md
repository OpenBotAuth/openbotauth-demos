# @oba-demos/signing-ts

RFC 9421 HTTP Message Signatures implementation for OpenBotAuth demos (Ed25519 only).

## Features

- ✅ RFC 9421 compliant HTTP Message Signatures
- ✅ Ed25519 signing using Node.js Web Crypto API
- ✅ Component canonicalization (`@method`, `@authority`, `@path`)
- ✅ Authority normalization (strips default ports)
- ✅ Base64 signatures (not base64url, per RFC 9421)
- ✅ Base64url nonces for replay protection
- ✅ 300s max signature window enforcement
- ✅ Compatible with OpenBotAuth verifier service

## Installation

```bash
pnpm install @oba-demos/signing-ts
```

## Quick Start with OpenBotAuth Keys

If you have keys from https://registry.openbotauth.org, use the key parser:

```bash
# From repository root
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt
# Generates .env with your keys automatically
```

Then import and use:

```typescript
import { makeSignedHeaders } from '@oba-demos/signing-ts';
```

## Usage

```typescript
import { makeSignedHeaders } from '@oba-demos/signing-ts';

const signedHeaders = await makeSignedHeaders(
  'GET',
  'https://blog.attach.dev/?p=6',
  {
    privateKeyPem: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
    keyId: 'my-key-001',
    signatureAgentUrl: 'https://registry.openbotauth.org/jwks/user.json',
  }
);

// Use with fetch
const response = await fetch(url, {
  method: 'GET',
  headers: signedHeaders,
});
```

## API

### `makeSignedHeaders(method, url, opts, headers?)`

Create signed headers for an HTTP request.

**Parameters:**
- `method` (string) - HTTP method (GET, POST, etc.)
- `url` (string) - Full URL to request
- `opts` (SigningOptions) - Signing configuration
  - `privateKeyPem` (string) - Ed25519 private key in PKCS8 PEM format
  - `keyId` (string) - Key identifier (kid)
  - `signatureAgentUrl` (string) - JWKS URL for Signature-Agent header
  - `created?` (number) - Unix timestamp (default: now)
  - `expires?` (number) - Unix timestamp (default: created + 300s)
  - `nonce?` (string) - Replay protection nonce (default: auto-generated)
  - `extraHeaders?` (string[]) - Additional headers to sign
- `headers?` (Record<string, string>) - Request headers (if signing non-derived components)

**Returns:** `Promise<SignedHeaders>`

```typescript
{
  'Signature-Input': 'sig1=("@method" "@authority" "@path");created=...;expires=...;nonce="...";keyid="...";alg="ed25519"',
  'Signature': 'sig1=:base64signature:',
  'Signature-Agent': 'https://registry.example.com/jwks/user.json',
  'User-Agent': 'OpenBotAuth-Demos/0.1.0'
}
```

## Signature Format

Follows RFC 9421 with these specifics:

**Components signed (in order):**
1. `@method` - HTTP method (e.g., GET)
2. `@authority` - Host (normalized, default ports stripped)
3. `@path` - Path + query string

**Signature base example:**
```
"@method": GET
"@authority": blog.attach.dev
"@path": /?p=6
"@signature-params": ("@method" "@authority" "@path");created=1700000000;expires=1700000300;nonce="abc123";keyid="key-001";alg="ed25519"
```

**Encoding:**
- Signature value: **base64** (can contain `+`, `/`, `=`)
- Nonce: **base64url** (uses `-`, `_`, no padding)

**Constraints:**
- Max window: 300 seconds between `created` and `expires`
- Algorithm: Ed25519 only

## Testing

```bash
# Build
pnpm build

# Run tests
pnpm test
```

### Golden Vector Test

The test suite includes a golden vector test with fixed keys and inputs to ensure deterministic signatures. This allows cross-implementation verification (e.g., with Python).

**Test vector:**
- Private key: Fixed test key (see `test/signing.test.ts`)
- URL: `https://blog.attach.dev/?p=6`
- Method: `GET`
- Created: `1700000000`
- Expires: `1700000300`
- Nonce: `abc123def456`

## Compatibility

- **Node.js**: 20+ (for stable Web Crypto API)
- **OpenBotAuth verifier**: Compatible with `https://verifier.openbotauth.org/verify`

## Security Notes

1. **Never log private keys** - The signing functions will throw errors but won't log key material
2. **Signature redaction** - When logging, redact signature values beyond first 10 characters
3. **Time sync** - Ensure system clock is accurate (NTP recommended)
4. **Key storage** - Store private keys securely (env vars for demos, keychain/vault for production)

## License

Apache-2.0

