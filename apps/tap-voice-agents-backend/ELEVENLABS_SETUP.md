# ElevenLabs Agent Setup Guide

## Quick Setup

### 1. Pete (Cart Agent)

**Agent Role**: Pete is the user's shopping sub-agent running in their wallet/extension. He helps users pick products and add them to their cart.

**System Prompt:**

```
You are Pete, the user's shopping sub-agent running in their wallet/extension. In this demo you are visually embedded in a fashion website, but you always act on the user's behalf, not the merchant's. Your goal is to help the user pick products and add them to their cart using the add_to_cart tool.

Available products:
Classic White Shirt ($89)
Navy Blazer ($249)
Dark Denim Jeans ($129)
Brown Leather Loafers ($179)
Burgundy Polo Shirt ($79)
Tan Chinos ($99)
Black Dress Shoes ($199)
Charcoal Sweater ($119)

Behaviors:
- Be concise, friendly, and confident – you're "their agent", not a pushy salesperson.
- Ask quick clarifying questions if needed (size, color, which item), then call add_to_cart.
- After each tool call, summarize what you did: e.g., "I've added the Navy Blazer in your size to your cart."
- When the user wants to checkout, call initiate_checkout.
- Immediately after calling initiate_checkout, say:
  "Perfect – I've prepared your cart. I'm now handing you off to Penny, your checkout sub-agent, who will securely complete the payment. One moment…"
- Do not try to take payment or ask for card details yourself; that is Penny's job.
```

**Tools to Add:**

#### Tool 1: add_to_cart

```json
{
  "type": "webhook",
  "name": "add_to_cart",
  "description": "Add an item to the user's shopping cart",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "execution_mode": "immediate",
  "api_schema": {
    "url": "https://your-demo-url/webhooks/elevenlabs/cart",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "description": "Parameters for adding an item to the cart",
      "properties": [
        {
          "id": "item_name",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "The name of the product to add (e.g., 'Classic White Shirt', 'Denim Jacket')",
          "required": true
        },
        {
          "id": "quantity",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Number of items to add (defaults to 1 if user doesn't specify)",
          "required": false
        }
      ]
    }
  },
  "response_timeout_secs": 20
}
```

#### Tool 2: view_cart

```json
{
  "type": "webhook",
  "name": "view_cart",
  "description": "Show the current items in the shopping cart and total",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "execution_mode": "immediate",
  "api_schema": {
    "url": "https://your-demo-url/webhooks/elevenlabs/cart/view",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "description": "No real parameters are required to view the cart. The backend ignores the noop field.",
      "properties": [
        {
          "id": "noop",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Leave empty. This field is ignored by the backend.",
          "required": false
        }
      ]
    }
  },
  "response_timeout_secs": 20
}
```

#### Tool 3: initiate_checkout

```json
{
  "type": "webhook",
  "name": "initiate_checkout",
  "description": "Start the checkout process and hand off to the payment agent (Penny)",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "execution_mode": "immediate",
  "api_schema": {
    "url": "https://your-demo-url/webhooks/elevenlabs/cart/checkout",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "description": "No real parameters are required to initiate checkout. The backend ignores the noop field.",
      "properties": [
        {
          "id": "noop",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Leave empty. This field is ignored by the backend.",
          "required": false
        }
      ]
    }
  },
  "response_timeout_secs": 20
}
```

---

### 2. Penny (Payment Agent)

**Agent Role**: Penny is the user's checkout sub-agent running in their wallet/extension. She confirms the total and performs the TAP-style payment flow.

**System Prompt:**

```
You are Penny, the user's checkout sub-agent running in their wallet/extension. In this demo, you appear in the payment panel, but you always represent the user, not the merchant. Your role is to confirm the total and perform a TAP-style payment flow using the tools provided.

When a conversation with you starts:
1. Immediately call get_checkout_info to retrieve the current total and currency.
2. After getting the total, tell the user clearly:
   "Your checkout total is $X. Do you authorize this payment?"
3. Wait for explicit confirmation (e.g., "yes", "I authorize", "go ahead", "proceed").
4. When they confirm, call capture_consent with:
   - user_confirmed = true
   - consent_phrase set to the user's exact words of authorization.
5. Immediately after successful consent capture, call execute_payment with:
   - payment_token = "tok_visa_4242"
   - user_identifier = "demo_user"
6. After execute_payment succeeds, confirm:
   "Perfect – your payment of $X has been processed successfully. Thank you!"

Style guidelines:
- Be efficient and professional.
- Don't ask unnecessary questions; your only job is: confirm total → get authorization → process payment.
- If the user hesitates or says anything ambiguous, politely re-ask for a clear yes/no before proceeding.
- Never ask for real card numbers or sensitive data – this is a demo with a mock Visa issuer.
```

**Tools to Add:**

#### Tool 1: get_checkout_info

```json
{
  "type": "webhook",
  "name": "get_checkout_info",
  "description": "Get the checkout total and items from the current session",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "execution_mode": "immediate",
  "api_schema": {
    "url": "https://your-demo-url/webhooks/elevenlabs/payment/info",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "description": "No real parameters are required; the backend uses the current session/metadata to find the checkout info. The noop field is ignored.",
      "properties": [
        {
          "id": "noop",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Leave empty. This field is ignored by the backend.",
          "required": false
        }
      ]
    }
  },
  "response_timeout_secs": 20
}
```

#### Tool 2: capture_consent

```json
{
  "type": "webhook",
  "name": "capture_consent",
  "description": "Capture the user's verbal consent to authorize the payment",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "execution_mode": "immediate",
  "api_schema": {
    "url": "https://your-demo-url/webhooks/elevenlabs/payment/consent",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "description": "Verbal consent transcript and confirmation flag",
      "properties": [
        {
          "id": "transcript",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "The exact transcript of the user's authorization statement",
          "required": true
        },
        {
          "id": "user_confirmed",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Whether the user explicitly confirmed the payment ('true' or 'false')",
          "required": true
        }
      ]
    }
  },
  "response_timeout_secs": 20
}
```

#### Tool 3: execute_payment

```json
{
  "type": "webhook",
  "name": "execute_payment",
  "description": "Execute the payment after consent has been captured",
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto",
  "execution_mode": "immediate",
  "api_schema": {
    "url": "https://your-demo-url/webhooks/elevenlabs/payment/execute",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "description": "Mock payment execution parameters",
      "properties": [
        {
          "id": "payment_token",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Mock payment token (use 'tok_visa_4242' for demo)",
          "required": true
        },
        {
          "id": "user_identifier",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "User identifier (use 'demo_user' for demo)",
          "required": true
        }
      ]
    }
  },
  "response_timeout_secs": 20
}
```

---

## Testing Locally

### Option 1: Using localtunnel (Recommended - No signup required)

```bash
# Install localtunnel globally
npm install -g localtunnel

# Start your backend
cd apps/tap-voice-agents-backend && pnpm dev

# In another terminal, start localtunnel
lt --port 8090

# Copy the URL from output (e.g., https://lazy-shirts-bake.loca.lt)
# Replace 'your-demo-url' with this URL in all webhook configurations above
```

### Option 2: Using ngrok (Requires free account)

```bash
# Install ngrok
brew install ngrok  # Mac

# Sign up at https://dashboard.ngrok.com/signup
# Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
# Configure: ngrok config add-authtoken YOUR_TOKEN

# Start your backend
cd apps/tap-voice-agents-backend && pnpm dev

# In another terminal, start ngrok
ngrok http 8090

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Replace 'your-demo-url' with this URL in all webhook configurations above
```

### Option 3: Using Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflared  # Mac

# Start your backend
cd apps/tap-voice-agents-backend && pnpm dev

# In another terminal, start tunnel
cloudflared tunnel --url http://localhost:8090

# Copy the Cloudflare URL from output (e.g., https://abc-123-def.trycloudflare.com)
# Replace 'your-demo-url' with this URL in all webhook configurations above
```

---

## Webhook URL Summary

Replace `your-demo-url` with your tunnel URL in these endpoints:

**Pete's Tools:**
- `add_to_cart`: `https://your-demo-url/webhooks/elevenlabs/cart`
- `view_cart`: `https://your-demo-url/webhooks/elevenlabs/cart/view`
- `initiate_checkout`: `https://your-demo-url/webhooks/elevenlabs/cart/checkout`

**Penny's Tools:**
- `get_checkout_info`: `https://your-demo-url/webhooks/elevenlabs/payment/info`
- `capture_consent`: `https://your-demo-url/webhooks/elevenlabs/payment/consent`
- `execute_payment`: `https://your-demo-url/webhooks/elevenlabs/payment/execute`

---

## Environment Variables

Add to `apps/tap-voice-agents-frontend/.env`:

```bash
VITE_ELEVENLABS_API_KEY=your_api_key_here
VITE_ELEVENLABS_CART_AGENT_ID=pete_agent_id_here
VITE_ELEVENLABS_PAYMENT_AGENT_ID=penny_agent_id_here
```

---

## Testing the Flow

1. Start backend: `pnpm dev:tap-voice-backend`
2. Start tunnel: `lt --port 8090` (or ngrok/cloudflare)
3. Update webhook URLs in ElevenLabs dashboard with tunnel URL
4. Start frontend: `pnpm dev:tap-voice-frontend`
5. Open browser to `localhost:5175`
6. Click "🎤 Use Voice with Pete"
7. Say: "Add a white shirt to my cart"
8. Say: "I'd like to checkout"
9. Pete will hand off to Penny
10. Penny will ask for authorization
11. Say: "Yes, I authorize the payment"
12. Watch the sequence diagram animate!

---

## Troubleshooting

### Webhook not receiving calls

- Make sure tunnel is running and URL is publicly accessible
- Check that each tool has its own specific webhook URL configured in ElevenLabs
- Verify URLs don't have `/api/` prefix (backend routes are at `/webhooks/elevenlabs/*`)
- Check backend logs to see if webhooks are being hit

### Tools not working

- Verify the tool definitions match exactly (JSON format matters)
- Each tool must have its own webhook URL configured in ElevenLabs
- Check backend logs for incoming requests and errors
- Ensure `request_body_schema` properties match what backend expects

### Agent not responding

- Check ElevenLabs console for errors
- Verify API key and agent IDs in frontend `.env`
- Check browser console for connection errors
- Ensure microphone permissions are granted

### Handoff not working

- Ensure frontend has both agent IDs configured
- Pete must call `initiate_checkout` tool to trigger handoff
- Check that backend emits `checkout_initiated` SSE event
- Verify frontend is listening for the event

### Penny doesn't know the total

- Make sure Penny calls `get_checkout_info` first (system prompt instructs this)
- Check that checkout session exists in backend
- Verify backend returns total in response

### Payment not executing

- Verify all three Penny tools are configured with correct webhook URLs
- Check that consent was captured before payment execution
- Ensure backend has valid OBA signing keys configured
- Check backend logs for signature generation errors

---

## Product Catalog

Current products and prices:

| Product | Price |
|---------|-------|
| Classic White Shirt | $89 |
| Navy Blazer | $249 |
| Dark Denim Jeans | $129 |
| Brown Leather Loafers | $179 |
| Burgundy Polo Shirt | $79 |
| Tan Chinos | $99 |
| Black Dress Shoes | $199 |
| Charcoal Sweater | $119 |

These prices are hardcoded in the backend (`apps/tap-voice-agents-backend/src/routes/elevenlabs.ts`).
