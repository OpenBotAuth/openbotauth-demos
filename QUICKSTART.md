# OpenBotAuth Demos - Quick Start Guide

Get the demos running in under 10 minutes.

## Prerequisites

- Node.js 20+ and pnpm 8+
- Python 3.10+
- Ed25519 keypair (instructions below)

## Step 1: Generate Keys

### Option A: Use OpenBotAuth Registry (Recommended)

1. Visit https://registry.openbotauth.org (or run locally)
2. Sign in with GitHub
3. Generate and register your Ed25519 keypair
4. Copy your private key, public key, KID, and JWKS URL

### Option B: Generate Locally

```bash
# Generate keys using OpenSSL
openssl genpkey -algorithm ed25519 -out private_key.pem
openssl pkey -in private_key.pem -pubout -out public_key.pem

# View private key
cat private_key.pem

# View public key
cat public_key.pem
```

**Note:** If using local keys, register them with the OpenBotAuth registry before testing.

## Step 2: Configure Environment

**🚀 Automatic (Recommended):**

```bash
# Parse your OpenBotAuth key file - ONE COMMAND!
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt
# This generates .env automatically with all your keys!
```

**Manual (if needed):**

```bash
# Copy example config
cp .env.example .env

# Edit .env with your keys
nano .env
```

Required values:

```bash
OBA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----
... your private key ...
-----END PRIVATE KEY-----"

OBA_KID="your-key-id"
OBA_SIGNATURE_AGENT_URL="https://registry.openbotauth.org/jwks/your-username.json"
DEMO_URL="https://blog.attach.dev/?p=6"
```

## Step 3A: Run Python Agent Demo

```bash
cd examples/langchain-agent

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy config (or use root .env)
cp .env.example .env
# Edit with your keys

# Test unsigned request (should get teaser)
python demo_agent.py --mode unsigned

# Test signed request (should get full content)
python demo_agent.py --mode signed
```

**Expected results:**
- Unsigned: `[TEASER]` indicator, limited content
- Signed: `[FULL]` indicator, `X-OBA-Decision: allow` header

## Step 3B: Run Web Widget Demo

```bash
# Install dependencies (from root)
pnpm install

# Build signing package
cd packages/signing-ts
pnpm build
cd ../..

# Terminal 1: Start backend
pnpm dev:widget-backend
# Should show: "🚀 OpenBotAuth Widget Backend" on port 8089

# Terminal 2: Start frontend
pnpm dev:widget-frontend
# Should start on port 5174
```

Open http://localhost:5174:

1. Enter URL: `https://blog.attach.dev/?p=6`
2. Click "🔓 Unsigned" → Click "Fetch" → See teaser
3. Click "🔐 Signed" → Click "Fetch" → See full content + signature headers

## Troubleshooting

### "Configuration errors for signed mode"

Ensure your `.env` has:
- `OBA_PRIVATE_KEY_PEM` (complete PEM with `-----BEGIN/END-----`)
- `OBA_KID`
- `OBA_SIGNATURE_AGENT_URL`

### "Signature verification failed"

1. Check your public key is registered in the registry:
   ```bash
   curl https://registry.openbotauth.org/jwks/your-username.json
   ```

2. Verify it returns valid JWKS with your key

3. Ensure system clock is accurate (NTP)

### Python import errors

```bash
# Activate virtual environment
source .venv/bin/activate

# Reinstall
pip install --upgrade -r requirements.txt
```

### Widget backend won't start

```bash
# Check if signing-ts is built
ls packages/signing-ts/dist

# If not, build it
cd packages/signing-ts
pnpm install
pnpm build
```

## Next Steps

- Read the [main README](README.md) for detailed documentation
- Check component READMEs:
  - [Python Agent](examples/langchain-agent/README.md)
  - [Widget Backend](apps/widget-backend/README.md)
  - [Widget Frontend](apps/widget-frontend/README.md)
  - [Signing Package](packages/signing-ts/README.md)

## Video Demo Script (90 seconds)

1. **[0:00-0:15]** Terminal: `python demo_agent.py --mode unsigned` → Show teaser
2. **[0:15-0:30]** Terminal: `python demo_agent.py --mode signed` → Show full content
3. **[0:30-1:00]** Browser: Show widget, toggle unsigned/signed, display results
4. **[1:00-1:30]** Highlight signature headers diff and `X-OBA-Decision`

## Key Concepts

**RFC 9421 Signature Components:**
- `@method` - HTTP method (GET)
- `@authority` - Host (normalized, default ports stripped)
- `@path` - Path + query string

**Signature Format:**
```
Signature-Input: sig1=("@method" "@authority" "@path");created=...;expires=...;nonce="...";keyid="...";alg="ed25519"
Signature: sig1=:base64signature:
Signature-Agent: https://registry.openbotauth.org/jwks/user.json
```

**Encoding:**
- Signature value: base64 (can have `+`, `/`, `=`)
- Nonce: base64url (uses `-`, `_`, no padding)

**Time window:** Max 300 seconds between `created` and `expires`

## Support

- Main project: https://github.com/hammadtq/openbotauth
- Issues: https://github.com/hammadtq/openbotauth-demos/issues
- Docs: https://www.rfc-editor.org/rfc/rfc9421.html

