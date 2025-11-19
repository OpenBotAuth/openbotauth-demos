# Widget Backend

Express server providing signed/unsigned fetch API for the OpenBotAuth demo widget.

## Features

- ✅ POST `/api/fetch` - Perform unsigned or signed HTTP requests
- ✅ GET `/healthz` - Health check endpoint
- ✅ RFC 9421 signature support via `@oba-demos/signing-ts`
- ✅ Automatic redirect handling with re-signing
- ✅ Request logging with signature redaction
- ✅ CORS enabled for frontend
- ✅ 30s request timeout

## Installation

```bash
pnpm install
```

## Configuration

### 🚀 Quick Setup (Automatic)

If you have an OpenBotAuth key file from https://registry.openbotauth.org:

```bash
# From repository root
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt
# This generates .env automatically with all keys configured!
```

### Manual Setup

Create `.env` file (or use root `.env`):

```bash
OBA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
OBA_KID="your-key-id"
OBA_SIGNATURE_AGENT_URL="https://registry.openbotauth.org/jwks/username.json"
WIDGET_PORT=8089
```

## Usage

### Development

```bash
pnpm dev
```

Server runs on `http://localhost:8089`

### Production

```bash
pnpm build
pnpm start
```

## API Reference

### POST /api/fetch

Perform an HTTP fetch with optional signature.

**Request:**
```json
{
  "url": "https://blog.attach.dev/?p=6",
  "signed": true,
  "extraHeaders": {
    "X-Custom": "value"
  }
}
```

**Response:**
```json
{
  "status": 200,
  "bytes": 15234,
  "headers": {
    "content-type": "text/html",
    "x-oba-decision": "allow"
  },
  "bodySnippet": "First ~400 characters...",
  "signed": true,
  "request": {
    "method": "GET",
    "url": "https://blog.attach.dev/?p=6",
    "headers": {
      "Signature-Input": "sig1=...",
      "Signature": "sig1=:abc123...[REDACTED]:",
      "Signature-Agent": "https://registry.openbotauth.org/jwks/user.json"
    }
  },
  "trace": {
    "created": 1700000000,
    "expires": 1700000300,
    "keyId": "my-key-001",
    "signatureInput": "sig1=(...);created=...;expires=...;nonce=\"...\";keyid=\"...\";alg=\"ed25519\""
  }
}
```

### GET /healthz

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "hasKeys": true
}
```

## Redirect Handling

When a signed request receives a 3xx redirect, the backend automatically:

1. Extracts the `Location` header
2. Generates a new signature for the redirect URL
3. Follows the redirect with the new signature
4. Returns the final response

This ensures signatures remain valid throughout redirect chains.

## Security

- ✅ Private keys never logged
- ✅ Signature values redacted in logs (first 10 chars only)
- ✅ CORS configured for widget frontend
- ✅ Request timeout (30s) prevents hanging
- ✅ Input validation on all endpoints

## Logging

Example log output:

```
🚀 OpenBotAuth Widget Backend
📡 Server:    http://localhost:8089
🔑 Keys:      ✅ Loaded
📊 Health:    http://localhost:8089/healthz
🎯 Endpoint:  POST /api/fetch

2024-01-01T00:00:00.000Z ✅ GET https://blog.attach.dev/?p=6 → 200 (234ms) 🔐 SIGNED
```

## Testing

```bash
# Test unsigned request
curl -X POST http://localhost:8089/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://blog.attach.dev/?p=6", "signed": false}'

# Test signed request
curl -X POST http://localhost:8089/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://blog.attach.dev/?p=6", "signed": true}'

# Health check
curl http://localhost:8089/healthz
```

## License

Apache-2.0

