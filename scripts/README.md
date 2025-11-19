# OpenBotAuth Key Parser

Automatically parse OpenBotAuth registry key files and generate `.env` configuration.

## Usage

When you download keys from https://registry.openbotauth.org, you'll get a file like `openbotauth-keys-username.txt`.

Simply run:

```bash
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt
```

This will:
1. Parse your private key, public key, KID, and JWKS URL
2. Generate a `.env` file in the repository root
3. Configure everything needed to run the demos

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

The script generates a `.env` file with all required configuration:

```bash
OBA_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."
OBA_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----..."
OBA_KID="abc123def456"
OBA_SIGNATURE_AGENT_URL="https://api.openbotauth.org/jwks/username.json"
DEMO_URL="https://blog.attach.dev/?p=6"
WIDGET_PORT=8089
WIDGET_SIGNED_DEFAULT=false
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

