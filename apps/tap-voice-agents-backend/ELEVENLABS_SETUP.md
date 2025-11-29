# ElevenLabs Agent Setup Guide

## Quick Setup

### 1. Pete (Cart Agent)

**Important:** All Pete's tools use the **same base webhook URL**: `https://your-tunnel-url/webhooks/elevenlabs/cart`

**Tools to Add:**

#### Tool 1: add_to_cart
- **Webhook URL:** `https://your-tunnel-url/webhooks/elevenlabs/cart`
```json
{
  "name": "add_to_cart",
  "description": "Add an item to the user's shopping cart",
  "parameters": {
    "type": "object",
    "properties": {
      "item_name": {
        "type": "string",
        "description": "The name of the product to add (e.g., 'Classic White Shirt', 'Denim Jacket', 'Black Trousers', 'Leather Boots')"
      },
      "quantity": {
        "type": "number",
        "description": "Number of items to add",
        "default": 1
      }
    },
    "required": ["item_name"]
  }
}
```

#### Tool 2: view_cart
- **Webhook URL:** `https://your-tunnel-url/webhooks/elevenlabs/cart/view`
```json
{
  "name": "view_cart",
  "description": "Show the current items in the shopping cart and total",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

#### Tool 3: initiate_checkout
- **Webhook URL:** `https://your-tunnel-url/webhooks/elevenlabs/cart/checkout`
```json
{
  "name": "initiate_checkout",
  "description": "Start the checkout process and hand off to the payment agent (Penny)",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

**System Prompt:**
```
You are Pete, a friendly shopping assistant for a premium fashion store. Help users browse products and add items to their cart. When they're ready to checkout, use the initiate_checkout tool and tell them you're connecting them to Penny, our payment specialist. Be conversational and helpful.

Available products:
- Classic White Shirt ($99)
- Denim Jacket ($149)
- Black Trousers ($129)
- Leather Boots ($199)
```

---

### 2. Penny (Payment Agent)

**Important:** All Penny's tools use the **same base webhook URL**: `https://your-tunnel-url/webhooks/elevenlabs/payment`

**Tools to Add:**

#### Tool 1: get_checkout_info
- **Webhook URL:** `https://your-tunnel-url/webhooks/elevenlabs/payment/info`
```json
{
  "name": "get_checkout_info",
  "description": "Get the checkout total and items. Call this FIRST when you start talking to the user.",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

#### Tool 2: capture_consent
- **Webhook URL:** `https://your-tunnel-url/webhooks/elevenlabs/payment/consent`
```json
{
  "name": "capture_consent",
  "description": "Capture the user's verbal consent to authorize the payment",
  "parameters": {
    "type": "object",
    "properties": {
      "transcript": {
        "type": "string",
        "description": "The exact transcript of the user's authorization statement"
      },
      "user_confirmed": {
        "type": "boolean",
        "description": "Whether the user explicitly confirmed the payment (true/false)"
      }
    },
    "required": ["transcript", "user_confirmed"]
  }
}
```

#### Tool 3: execute_payment
- **Webhook URL:** `https://your-tunnel-url/webhooks/elevenlabs/payment/execute`
```json
{
  "name": "execute_payment",
  "description": "Execute the payment after consent has been captured",
  "parameters": {
    "type": "object",
    "properties": {
      "payment_token": {
        "type": "string",
        "description": "Mock payment token (always use 'tok_visa_4242' for demo)"
      },
      "user_identifier": {
        "type": "string",
        "description": "User identifier (always use 'demo_user' for demo)"
      }
    },
    "required": ["payment_token", "user_identifier"]
  }
}
```

**System Prompt:**
```
You are Penny, a professional payment processor. Follow this exact flow:

1. IMMEDIATELY call get_checkout_info to retrieve the order total
2. Greet the user and state: "Your checkout total is $X. Do you authorize this payment?"
3. When they say yes/confirm, IMMEDIATELY call capture_consent with their exact words and user_confirmed=true
4. IMMEDIATELY after consent, call execute_payment with payment_token='tok_visa_4242' and user_identifier='demo_user'
5. Confirm: "Perfect! Your payment of $X has been processed. Thank you!"

Be proactive - call each tool immediately in sequence. Do not wait or ask additional questions between steps.
```

---

## Testing Locally

### Option 1: Using Cloudflare Tunnel (Recommended - No signup required)

1. Install cloudflared: `brew install cloudflared` (Mac)
2. Start your backend: `cd apps/tap-voice-agents-backend && pnpm dev`
3. In another terminal: `cloudflared tunnel --url http://localhost:8090`
4. Copy the Cloudflare URL from the output (e.g., `https://abc-123-def.trycloudflare.com`)
5. Update webhook URLs in ElevenLabs for **each tool**:

**Pete's Tools:**
- `add_to_cart`: `https://abc-123-def.trycloudflare.com/webhooks/elevenlabs/cart`
- `view_cart`: `https://abc-123-def.trycloudflare.com/webhooks/elevenlabs/cart/view`
- `initiate_checkout`: `https://abc-123-def.trycloudflare.com/webhooks/elevenlabs/cart/checkout`

**Penny's Tools:**
- `get_checkout_info`: `https://abc-123-def.trycloudflare.com/webhooks/elevenlabs/payment/info`
- `capture_consent`: `https://abc-123-def.trycloudflare.com/webhooks/elevenlabs/payment/consent`
- `execute_payment`: `https://abc-123-def.trycloudflare.com/webhooks/elevenlabs/payment/execute`

### Option 2: Using ngrok (Requires free account)

1. Install ngrok: `brew install ngrok` (Mac) or download from ngrok.com
2. Sign up at https://dashboard.ngrok.com/signup
3. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
4. Configure: `ngrok config add-authtoken YOUR_TOKEN`
5. Start your backend: `cd apps/tap-voice-agents-backend && pnpm dev`
6. In another terminal: `ngrok http 8090`
7. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
8. Update webhook URLs in ElevenLabs for **each tool** (same as Cloudflare above, just replace the domain)

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
2. Start frontend: `pnpm dev:tap-voice-frontend`
3. Open browser to `localhost:5175`
4. Click "🎤 Use Voice with Pete"
5. Say: "Add a white shirt to my cart"
6. Say: "I'd like to checkout"
7. Pete will hand off to Penny
8. Penny will ask for authorization
9. Say: "Yes, I authorize the payment"
10. Watch the sequence diagram animate!

---

## Troubleshooting

- **Webhook not receiving calls:** 
  - Make sure Cloudflare Tunnel or ngrok is running
  - Check that each tool has its own specific webhook URL (not just the base URL)
  - Verify URLs don't have `/api/` prefix (backend routes are at `/webhooks/elevenlabs/*`)
  
- **Tools not working:** 
  - Verify the tool definitions match exactly (JSON format matters)
  - Each tool must have its own webhook URL configured in ElevenLabs
  - Check backend logs to see if webhooks are being hit
  
- **Agent not responding:** 
  - Check ElevenLabs console for errors
  - Verify API key and agent IDs in frontend `.env`
  
- **Handoff not working:** 
  - Ensure frontend has both agent IDs configured
  - Pete must call `initiate_checkout` tool to trigger handoff
  
- **Penny doesn't know the total:**
  - Make sure Penny calls `get_checkout_info` first
  - Update Penny's system prompt to be more proactive
  
- **Payment not executing:**
  - Verify all three Penny tools are configured with correct webhook URLs
  - Check that consent was captured before payment execution

