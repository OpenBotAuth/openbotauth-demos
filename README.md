# OpenBotAuth Demos

**Proof-of-concept demos showing RFC 9421 HTTP Message Signatures for agent authentication:**
- **Unsigned agent** → teaser or 402 Payment Required
- **Signed agent** (Ed25519 + JWKS) → full content

This repository contains standalone demo applications that integrate with the [OpenBotAuth](https://github.com/hammadtq/openbotauth) ecosystem.

---

## What It Does

These demos prove a simple concept: agents that cryptographically identify themselves get full access, while unsigned agents see limited content:

1. **Unsigned fetch** → Origin returns teaser (first N words) or 402 response
2. **Signed fetch** → Origin validates signature via RFC 9421, returns full content with `X-OBA-Decision: allow`

**No CDN lock-in.** The origin server (WordPress + OpenBotAuth plugin) performs verification using the OpenBotAuth verifier service.

---

## Demos Included

### 1. Python LangChain Agent (`examples/langchain-agent/`)

Command-line demo showing unsigned vs signed HTTP requests:

```bash
# Unsigned request (gets teaser or 402)
python demo_agent.py --mode unsigned

# Signed request (gets full content)
python demo_agent.py --mode signed
```

**Features:**
- RFC 9421 HTTP Message Signatures
- Ed25519 signing
- Clear terminal output showing headers and content differences
- Optional LangChain integration for content summarization

### 2. Web Widget (`apps/widget-backend/` + `apps/widget-frontend/`)

Interactive web UI demonstrating signed fetch with visual diff:

- Enter any URL protected by OpenBotAuth
- Toggle between unsigned/signed modes
- See request headers, response status, and body preview
- Visual diff showing added signature headers

---

## Quick Start

### Prerequisites

1. **Node.js 20+** and **pnpm 8+**
2. **Python 3.10+** (for agent demo)
3. **Ed25519 keypair** registered with OpenBotAuth registry
4. **Target URL** with OpenBotAuth plugin (default: `https://blog.attach.dev/?p=6`)

### 1. Generate Keys

**Option A: Use existing OpenBotAuth registry** (recommended)

Visit the [OpenBotAuth Registry Portal](https://registry.openbotauth.org) or run locally:

```bash
# In the main openbotauth repo
cd packages/bot-cli
pnpm install
pnpm dev keygen
# Follow prompts to generate and register keys
```

**Option B: Generate standalone keys** (for testing)

```bash
# Using OpenSSL
openssl genpkey -algorithm ed25519 -out private_key.pem
openssl pkey -in private_key.pem -pubout -out public_key.pem
```

### 2. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env and add your keys
# - OBA_PRIVATE_KEY_PEM: Your Ed25519 private key (PEM format)
# - OBA_PUBLIC_KEY_PEM: Your Ed25519 public key (PEM format)
# - OBA_KID: Your key ID from the registry
# - OBA_SIGNATURE_AGENT_URL: Your JWKS URL from the registry
```

### 3. Run Python Agent Demo

```bash
cd examples/langchain-agent

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your keys

# Test unsigned (should get teaser/402)
python demo_agent.py --mode unsigned --url https://blog.attach.dev/?p=6

# Test signed (should get full content)
python demo_agent.py --mode signed --url https://blog.attach.dev/?p=6
```

**Expected output:**

- **Unsigned**: `Status: 200` with `[TEASER]` indicator, limited content
- **Signed**: `Status: 200` with `X-OBA-Decision: allow` header, full content

### 4. Run Web Widget

```bash
# Install all dependencies
pnpm install

# Terminal 1: Start backend
pnpm dev:widget-backend
# Runs on http://localhost:8089

# Terminal 2: Start frontend
pnpm dev:widget-frontend
# Runs on http://localhost:5174
```

Open http://localhost:5174 in your browser:

1. Enter URL: `https://blog.attach.dev/?p=6`
2. Click "Fetch Unsigned" → see teaser
3. Click "Fetch Signed" → see full content + signature headers

---

## How It Works

```mermaid
sequenceDiagram
    participant Agent
    participant Origin as WordPress + OBA Plugin
    participant Verifier as verifier.openbotauth.org

    Note over Agent,Verifier: Unsigned Request
    Agent->>Origin: GET /protected (no signature)
    Origin-->>Agent: 200 OK (teaser content)

    Note over Agent,Verifier: Signed Request
    Agent->>Agent: Sign with Ed25519 private key
    Agent->>Origin: GET /protected + Signature headers
    Origin->>Verifier: POST /verify (signature + JWKS URL)
    Verifier->>Verifier: Fetch JWKS, verify signature
    Verifier-->>Origin: {verified: true, agent: {...}}
    Origin-->>Agent: 200 OK (full content) + X-OBA-Decision: allow
```

**Signature Format (RFC 9421):**

```
Signature-Input: sig1=("@method" "@authority" "@path");created=1234567890;expires=1234568190;nonce="abc123";keyid="key-001";alg="ed25519"
Signature: sig1=:SGVsbG8gV29ybGQK...:
Signature-Agent: https://registry.openbotauth.org/jwks/username.json
```

**Components signed:**
- `@method`: HTTP method (GET, POST, etc.)
- `@authority`: Host + port (e.g., `blog.attach.dev`)
- `@path`: Path + query string (e.g., `/?p=6`)

**Key details:**
- Algorithm: Ed25519 (EdDSA)
- Signature encoding: base64 (not base64url)
- Nonce: base64url-encoded random 16 bytes
- Time window: `(expires - created) ≤ 300s`

---

## Repository Structure

```
openbotauth-demos/
├── README.md                          # This file
├── LICENSE                            # Apache 2.0
├── package.json                       # Root workspace
├── pnpm-workspace.yaml               # pnpm workspace config
├── .env.example                       # Environment template
├── examples/
│   └── langchain-agent/              # Python demo
│       ├── demo_agent.py             # CLI tool
│       ├── signed_fetch.py           # RFC 9421 signer
│       ├── requirements.txt
│       └── README.md
├── packages/
│   └── signing-ts/                   # Shared TypeScript signing library
│       ├── src/
│       │   ├── index.ts              # Main exports
│       │   ├── rfc9421.ts            # RFC 9421 canonicalization
│       │   └── ed25519.ts            # Ed25519 crypto
│       └── test/
│           └── signing.test.ts       # Unit tests
└── apps/
    ├── widget-backend/               # Express API server
    │   └── src/
    │       ├── server.ts             # /api/fetch endpoint
    │       ├── config.ts
    │       └── types.ts
    └── widget-frontend/              # React UI
        └── src/
            ├── App.tsx               # Main component
            └── components/
                └── HeadersDiff.tsx   # Signature headers diff view
```

---

## Standards & References

- **[RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html)** — HTTP Message Signatures
- **[RFC 7517](https://www.rfc-editor.org/rfc/rfc7517.html)** — JSON Web Key (JWK)
- **[Ed25519](https://ed25519.cr.yp.to/)** — EdDSA signature scheme
- **[OpenBotAuth](https://github.com/hammadtq/openbotauth)** — Main project (registry, verifier, WordPress plugin)

---

## Troubleshooting

### Signature Verification Fails

**Symptoms:** Signed requests return 403 or teaser instead of full content

**Checks:**
1. **Clock skew**: Ensure system time is accurate (NTP sync)
2. **Key registration**: Verify your public key is in the registry JWKS
3. **JWKS URL**: Confirm `OBA_SIGNATURE_AGENT_URL` is accessible and returns valid JWKS
4. **Signature format**: Check that signature uses base64 (not base64url)

```bash
# Test JWKS accessibility
curl https://registry.openbotauth.org/jwks/your-username.json

# Should return:
# {
#   "keys": [{"kty": "OKP", "crv": "Ed25519", "kid": "...", "x": "..."}],
#   "client_name": "..."
# }
```

### Python Agent Import Errors

```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Widget Backend Port Conflict

If port 8089 is in use:

```bash
# Edit .env
WIDGET_PORT=8090

# Restart backend
pnpm dev:widget-backend
```

---

## Development

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

### Testing Signature Compatibility

The TypeScript and Python implementations should produce identical signatures:

```bash
# Run golden vector test
cd packages/signing-ts
pnpm test

# Compare with Python
cd ../../examples/langchain-agent
pytest test_signing.py  # (if tests are added)
```

---

## 90-Second Video Script

1. **[0:00-0:15]** Terminal: `python demo_agent.py --mode unsigned` → Show teaser response with `[TEASER]` tag
2. **[0:15-0:30]** Terminal: `python demo_agent.py --mode signed` → Show full response with `X-OBA-Decision: allow`
3. **[0:30-0:45]** Switch to browser: Open widget at `localhost:5174`
4. **[0:45-1:00]** Enter URL, click "Unsigned" → Show teaser + status panel
5. **[1:00-1:15]** Toggle to "Signed", click fetch → Show full content + headers diff highlighting `Signature-Input`, `Signature`, `Signature-Agent`
6. **[1:15-1:30]** Close: "Origin-first, provider-neutral bot auth. Code + docs at github.com/hammadtq/openbotauth-demos"

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built on [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html) HTTP Message Signatures
- Integrates with [OpenBotAuth](https://github.com/hammadtq/openbotauth) ecosystem
- Demo site provided by [Attach](https://attach.dev)

---

**Made for the agent economy** 🤖

