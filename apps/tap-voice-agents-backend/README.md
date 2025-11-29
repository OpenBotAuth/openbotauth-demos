# TAP Voice Agents Backend

Backend server for the TAP (Trusted Agent Protocol) Voice Agents demo, showcasing OpenBotAuth integration with ElevenLabs Conversational AI and Visa-style agentic commerce.

## Overview

This Node.js/Express backend implements:

- **Cart Management**: In-memory cart sessions via Pete (shopping agent)
- **Checkout Sessions**: Time-bound checkout with shared nonce
- **Consent Capture**: Voice consent proof storage
- **TAP-Style Signing**: RFC 9421 HTTP Message Signatures + application-level signatures for `agenticConsumer` and `agenticPaymentContainer` objects
- **OBA Verification**: Origin-side verification via `https://verifier.openbotauth.org/verify`
- **Mock Visa**: Simulated payment authorization
- **Server-Sent Events (SSE)**: Real-time sequence step updates to frontend
- **ElevenLabs Webhooks**: Tool handlers for Pete (cart) and Penny (payment) agents

## Architecture

```
┌─────────────┐     Webhook Tools      ┌──────────────────┐
│ ElevenLabs  │────────────────────────>│ TAP Voice Backend│
│ Voice Agent │                         └────────┬─────────┘
└─────────────┘                                  │
                                                 │ RFC 9421 Signed Request
                                                 v
                    ┌─────────────────────────────────────────┐
                    │ Merchant Origin Server (/merchant/*)    │
                    │ - Receives signed checkout              │
                    │ - Calls OBA Verifier (origin-side)      │
                    │ - Validates TAP objects                 │
                    │ - Calls Mock Visa                       │
                    │ - Emits SSE events to frontend          │
                    └─────────────────────────────────────────┘
                                    │
                                    v
                    ┌─────────────────────────────┐
                    │ OpenBotAuth Verifier Service│
                    │ (https://verifier.          │
                    │  openbotauth.org/verify)    │
                    └─────────────────────────────┘
```

**Key Point**: The merchant backend acts as the **origin server**, calling the OBA verifier directly. No CDN proxy is required—this demonstrates OpenBotAuth's origin-first, CDN-agnostic design.

## Setup

### 1. Install Dependencies

```bash
cd apps/tap-voice-agents-backend
pnpm install
```

### 2. Configure Environment

#### Required: OpenBotAuth Keys

1. Go to https://registry.openbotauth.org
2. Register and download your key file (e.g., `openbotauth-keys-hammadtq.txt`)
3. Run from repo root to generate `.env` from template:
   ```bash
   node scripts/parse-keys.js /path/to/openbotauth-keys-hammadtq.txt apps/tap-voice-agents-backend
   ```
   This will:
   - Read your OBA keys
   - Use `.env.example` as a template
   - Generate `apps/tap-voice-agents-backend/.env` with your keys filled in
   
4. **Important**: Open `.env` and fill in the remaining fields:
   ```bash
   cd apps/tap-voice-agents-backend
   nano .env  # or use your preferred editor
   ```
   
   You still need to add:
   - `ELEVENLABS_API_KEY` (if using voice agents)
   - `ELEVENLABS_CART_AGENT_ID` (Pete's agent ID)
   - `ELEVENLABS_PAYMENT_AGENT_ID` (Penny's agent ID)

#### Optional: ElevenLabs Agents

If you want full voice interaction:

1. Get API key from https://elevenlabs.io/app/settings/api-keys
2. Create two agents in ElevenLabs dashboard:
   - **Pete** (Shopping assistant): Configure with `add_to_cart`, `view_cart`, `initiate_checkout` tools
   - **Penny** (Payment processor): Configure with `capture_consent`, `execute_payment` tools
3. Set `ELEVENLABS_API_KEY`, `ELEVENLABS_CART_AGENT_ID`, and `ELEVENLABS_PAYMENT_AGENT_ID` in `.env`

Without ElevenLabs, the demo still works using the manual controls in the voice interface.

### 3. Run Development Server

```bash
pnpm dev
```

Server runs on http://localhost:8090

## API Endpoints

### Cart API

- **POST /api/cart/add** - Add item to cart
- **GET /api/cart/view?sessionId=xxx** - View cart contents
- **POST /api/cart/clear** - Clear cart

### Checkout API

- **POST /api/checkout/initiate** - Create checkout session
- **GET /api/checkout/session/:checkoutId** - Get checkout session

### Consent API

- **POST /api/consent/capture** - Record user consent
- **GET /api/consent/verify/:checkoutId** - Check consent status

### Payment API

- **POST /api/payment/execute** - Execute TAP-style signed payment

### Merchant Origin API

- **POST /merchant/checkout** - Merchant endpoint that:
  1. Receives RFC 9421 signed request
  2. Calls OBA verifier at origin
  3. Validates TAP objects
  4. Calls Visa for authorization
  5. Returns order confirmation

### Events API

- **GET /api/events/stream** - SSE stream for sequence diagram updates

### Webhooks

- **POST /webhooks/elevenlabs/cart** - Pete's tool handlers
- **POST /webhooks/elevenlabs/payment** - Penny's tool handlers

## TAP Object Signatures

The backend creates two signed TAP objects:

### agenticConsumer

```json
{
  "version": "1.0",
  "userId": "user123",
  "consentProofId": "consent-uuid",
  "nonce": "shared-nonce",
  "created": 1234567890,
  "expires": 1234568370,
  "agentId": "https://registry.openbotauth.org/jwks/username.json",
  "signature": "base64-ed25519-signature"
}
```

### agenticPaymentContainer

```json
{
  "version": "1.0",
  "tokenHash": "sha256-of-payment-token",
  "amount": 467,
  "currency": "USD",
  "merchantId": "DEMO_MERCHANT_001",
  "nonce": "shared-nonce",
  "created": 1234567890,
  "expires": 1234568370,
  "agentId": "https://registry.openbotauth.org/jwks/username.json",
  "signature": "base64-ed25519-signature"
}
```

Both objects are signed using the same Ed25519 private key and share the same `nonce`, `created`, and `expires` values, which are also present in the RFC 9421 HTTP Message Signature.

## Security Features

- **Triple-Layer Signing**: HTTP Message Signature (RFC 9421) + two application-level TAP object signatures
- **Nonce Consistency**: Single nonce across all three signature layers prevents replay attacks
- **Time-Bound Sessions**: 8-minute expiration window from checkout initiation to payment
- **Consent Window**: Ensures payment executes within 8 minutes of user consent
- **Origin-Side Verification**: Merchant controls where/how verification happens

## Development Notes

- All sessions stored in-memory (not production-ready)
- Mock Visa always approves (controlled by `MOCK_VISA_ALWAYS_APPROVE`)
- SSE clients automatically cleaned up on disconnect
- CORS configured for `FRONTEND_URL` origin

## License

Apache-2.0

