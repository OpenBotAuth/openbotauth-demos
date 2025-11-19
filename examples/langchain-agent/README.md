# Python LangChain Agent Demo

Command-line demo showing OpenBotAuth RFC 9421 signed HTTP requests.

## Features

- ✅ RFC 9421 HTTP Message Signatures (Ed25519)
- ✅ Unsigned vs Signed request comparison
- ✅ Automatic redirect handling with re-signing
- ✅ Clean terminal output with emojis
- ✅ Teaser detection with `[TEASER]`/`[FULL]` indicators
- ✅ Exit codes: 0 (full access), 2 (teaser/402), 1 (error)
- ✅ Optional LangChain integration (commented out by default)

## Installation

### 1. Create virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

**🚀 Automatic (Recommended):**

```bash
# Parse your OpenBotAuth key file
python parse_keys.py ~/Downloads/openbotauth-keys-username.txt
# This generates .env automatically!
```

**Manual (if needed):**

```bash
cp .env.example .env
# Edit .env with your keys
```

Required configuration in `.env`:

```bash
OBA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----
...your Ed25519 private key...
-----END PRIVATE KEY-----"

OBA_KID="your-key-id"
OBA_SIGNATURE_AGENT_URL="https://registry.openbotauth.org/jwks/username.json"
DEMO_URL="https://blog.attach.dev/?p=6"
```

## Usage

### Basic Usage

```bash
# Unsigned request (gets teaser or 402)
python demo_agent.py --mode unsigned

# Signed request (gets full content)
python demo_agent.py --mode signed
```

### Custom URL

```bash
python demo_agent.py --mode signed --url https://example.com/protected
```

### Verbose mode

```bash
python demo_agent.py --mode signed --verbose
```

## Output Example

### Unsigned Request

```
🎯 Target URL: https://blog.attach.dev/?p=6

======================================================================
  🔓 UNSIGNED REQUEST
======================================================================

✅ Status: 200 OK
📦 Size: 2,456 bytes

📋 Key Headers:
  • X-OBA-Decision: TEASER
  • Content-Type: text/html; charset=UTF-8

📄 Content Preview (first 200 chars):
----------------------------------------------------------------------
This is a demo WordPress site with OpenBotAuth plugin. This content
is being shown as a teaser because the request was not signed...

[TEASER]
----------------------------------------------------------------------
```

### Signed Request

```
🎯 Target URL: https://blog.attach.dev/?p=6

======================================================================
  🔐 SIGNED REQUEST
======================================================================

✅ Status: 200 OK
📦 Size: 15,234 bytes

📋 Key Headers:
  • X-OBA-Decision: ALLOW
  • Content-Type: text/html; charset=UTF-8
  • Signature-Input: sig1=("@method" "@authority" "@path");created=1700000000...
  • Signature-Agent: https://registry.openbotauth.org/jwks/username.json

📄 Content Preview (first 200 chars):
----------------------------------------------------------------------
This is a demo WordPress site with OpenBotAuth plugin. Full content
is available because the request was properly signed with a valid
Ed25519 signature. Lorem ipsum dolor sit amet, consectetur...

[FULL]
----------------------------------------------------------------------
```

## Exit Codes

- `0`: Full access granted (signed request successful)
- `2`: Teaser or 402 Payment Required
- `1`: Error (network error, invalid config, etc.)

Use in scripts:

```bash
python demo_agent.py --mode signed
if [ $? -eq 0 ]; then
    echo "Full access!"
else
    echo "Limited access or error"
fi
```

## How It Works

### RFC 9421 Signature Process

1. **Build signature base string**:
   ```
   "@method": GET
   "@authority": blog.attach.dev
   "@path": /?p=6
   "@signature-params": ("@method" "@authority" "@path");created=...;expires=...;nonce="...";keyid="...";alg="ed25519"
   ```

2. **Sign with Ed25519 private key**:
   - Parse PEM key to raw 32-byte seed
   - Sign the base string
   - Encode signature as base64 (NOT base64url)

3. **Add headers to request**:
   ```
   Signature-Input: sig1=(...);created=...;expires=...;nonce="...";keyid="...";alg="ed25519"
   Signature: sig1=:base64signature:
   Signature-Agent: https://registry.openbotauth.org/jwks/username.json
   ```

4. **Origin verifies**:
   - Extracts `Signature-Agent` URL
   - Fetches JWKS from registry
   - Verifies signature using public key
   - Returns decision in `X-OBA-Decision` header

### Redirect Handling

When a signed request receives a 3xx redirect:

1. Extract `Location` header
2. Generate new signature for redirect URL
3. Follow redirect with new signature
4. Return final response

This ensures signatures remain valid throughout redirect chains.

## Files

- `demo_agent.py` - Main CLI application
- `signed_fetch.py` - RFC 9421 signing implementation
- `requirements.txt` - Python dependencies
- `.env.example` - Configuration template

## Testing

### Test signing implementation

```bash
python signed_fetch.py
```

Should output test headers with deterministic signatures.

### Golden vector test

To verify compatibility with TypeScript implementation:

```bash
# In signing-ts package
cd ../../packages/signing-ts
pnpm test

# Compare output with Python
cd ../../examples/langchain-agent
python signed_fetch.py
```

Both should produce identical `Signature-Input` format for same inputs.

## Optional: LangChain Integration

To enable LangChain features (content summarization, etc.):

1. Uncomment LangChain dependencies in `requirements.txt`:
   ```
   langchain>=0.2.0
   langchain-openai>=0.1.0
   ```

2. Install:
   ```bash
   pip install langchain langchain-openai
   ```

3. Add OpenAI API key to `.env`:
   ```bash
   OPENAI_API_KEY="sk-..."
   ```

4. Modify `demo_agent.py` to use LangChain agents (see comments in code)

## Troubleshooting

### "Configuration errors for signed mode"

Ensure your `.env` file has all required fields:
- `OBA_PRIVATE_KEY_PEM` (in PEM format with newlines)
- `OBA_KID`
- `OBA_SIGNATURE_AGENT_URL`

### "Signature verification failed"

1. Check that your public key is registered in the registry
2. Verify `OBA_SIGNATURE_AGENT_URL` is accessible:
   ```bash
   curl https://registry.openbotauth.org/jwks/username.json
   ```
3. Ensure system clock is accurate (NTP sync)

### "Module not found"

Activate virtual environment:
```bash
source .venv/bin/activate
```

## Security Notes

- ✅ Private keys stay local (never transmitted)
- ✅ Signature window limited to 300s
- ✅ Nonces prevent replay attacks
- ✅ PEM keys validated on load

## License

Apache-2.0

