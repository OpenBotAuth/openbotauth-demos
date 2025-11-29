# OpenBotAuth Key Parser

Automatically parse OpenBotAuth registry key files and generate `.env` configuration.

## Usage

When you download keys from https://registry.openbotauth.org, you'll get a file like `openbotauth-keys-username.txt`.

### Basic Usage (Root .env)

Generate `.env` in the repository root (for widget demo):

```bash
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt
```

### App-Specific Usage (Template-Based)

Generate `.env` in a specific app directory using its `.env.example` as a template:

```bash
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt apps/tap-voice-agents-backend
```

This will:
1. Parse your private key, public key, KID, and JWKS URL
2. Look for `.env.example` in the target directory
3. If found, use it as a template and replace only `OBA_*` placeholders
4. Generate `.env` in the target directory
5. Leave other fields (like `ELEVENLABS_API_KEY`) for you to fill in manually

### Which Method to Use?

- **Root .env**: For widget demo (simple configuration)
- **App-specific**: For TAP Voice Agents (requires additional ElevenLabs config)

## Key File Format

The parser expects the OpenBotAuth key file format:

```
OpenBotAuth Key Pair
Generated: 2025-11-19T09:44:02.632Z
Username: username
JWKS URL: https://api.openbotauth.org/jwks/username.json

==============================================
KEY ID (KID)
==============================================
abc123def456

==============================================
PRIVATE KEY (Keep this secret!)
==============================================
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----

==============================================
PUBLIC KEY (PEM Format)
==============================================
-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

## Output

### Root .env (Simple)

When run without a target directory, generates a simple `.env`:

```bash
OBA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
OBA_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----..."
OBA_KID="abc123def456"
OBA_SIGNATURE_AGENT_URL="https://api.openbotauth.org/jwks/username.json"
DEMO_URL="https://blog.attach.dev/?p=6"
WIDGET_PORT=8089
WIDGET_SIGNED_DEFAULT=false
```

### App-Specific .env (Template-Based)

When run with a target directory that has `.env.example`, it fills in the OBA fields while preserving the template structure:

```bash
# apps/tap-voice-agents-backend/.env
OBA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."  # ✅ Filled in
OBA_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----..."    # ✅ Filled in
OBA_KID="abc123def456"                                # ✅ Filled in
OBA_SIGNATURE_AGENT_URL="https://..."                 # ✅ Filled in

# These remain as placeholders for you to fill in:
ELEVENLABS_API_KEY="sk_your_api_key_here"           # ⚠️ TODO
ELEVENLABS_CART_AGENT_ID="agent_xxxxxxxxxx"         # ⚠️ TODO
ELEVENLABS_PAYMENT_AGENT_ID="agent_yyyyyyyyyy"      # ⚠️ TODO
PORT=8090
FRONTEND_URL="http://localhost:5175"
# ... etc
```

## For Python Agent

The Python agent has its own parser:

```bash
cd examples/langchain-agent
python parse_keys.py ~/Downloads/openbotauth-keys-username.txt
```

## Troubleshooting

If parsing fails, ensure:
- The key file is in the exact OpenBotAuth format
- The file is not corrupted or modified
- All sections (KID, PRIVATE KEY, PUBLIC KEY, JWKS URL) are present

## Manual Configuration

If you need to configure manually, see the `.env.example` file in the repository root.

