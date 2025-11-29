# TAP Voice Agents Frontend

Premium fashion shopping experience with voice checkout, demonstrating Visa TAP-style agentic commerce powered by OpenBotAuth and ElevenLabs.

## Overview

React/TypeScript frontend featuring:

- **Premium UI**: Men's fashion product catalog with glass morphism cart
- **Two-Phase Experience**: Shopping with Pete → Checkout with Penny
- **Live Sequence Diagram**: Real-time visualization of TAP flow with OpenBotAuth swimlanes
- **DevTools Panel**: Inspect HTTP headers, TAP objects, and raw requests
- **Voice Interface**: ElevenLabs agent avatars with live transcripts
- **Smooth Animations**: 1.5s phase transition with orchestrated UI updates
- **SSE Integration**: Real-time sequence step updates from backend

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Phase 1: Shopping (Pete Active)                 │
│ ┌────────────────┬──────────┐                   │
│ │ Product Grid   │ Cart     │                   │
│ │ (2x4 layout)   │ Panel    │                   │
│ └────────────────┴──────────┘                   │
│ Sequence Diagram: Collapsed                     │
│ Voice: Pete (Shopping Assistant)                │
└──────────────────────────────────────────────────┘
                    ↓ Transition (1.5s)
┌──────────────────────────────────────────────────┐
│ Phase 2: Checkout (Penny Active)                │
│ ┌────────────────────────────────────────────┐  │
│ │ Live Sequence Diagram (70% height)         │  │
│ │ Agent → Merchant → OBA → Visa              │  │
│ └────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────┐  │
│ │ DevTools Panel (30% height)                │  │
│ │ [HTTP] [Consumer] [Payment] [Raw]          │  │
│ └────────────────────────────────────────────┘  │
│ Voice: Penny (Payment Processor)                │
└──────────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
cd apps/tap-voice-agents-frontend
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

Frontend runs on http://localhost:5175

## Demo Flow

### Phase 1: Shopping

1. **Browse Products**: 8 men's fashion items displayed in grid
2. **Add to Cart**: Click "Add to Cart" or say "Add white shirt to cart" to Pete
3. **View Cart**: Side panel slides in showing items and total
4. **Initiate Checkout**: Click "Proceed to Checkout" or say "I'm ready to checkout"

### Phase 2: Checkout (Animated Transition)

- **T+0ms**: Products fade and blur
- **T+300ms**: Cart shrinks and locks to top-right corner
- **T+500ms**: Sequence diagram expands to 70% height
- **T+800ms**: DevTools panel slides up from bottom
- **T+1000ms**: Avatar morphs from Pete (blue) to Penny (purple)
- **T+1200ms**: Sequence participants appear
- **T+1500ms**: Ready for payment authorization

### Payment Flow

1. **Penny Asks**: "Your total is $467. Do you authorize this purchase?"
2. **User Confirms**: Say "Yes" or click "Authorize Payment"
3. **Sequence Animates**: Watch real-time steps:
   - Step 1: Agent sends signed request to Merchant
   - Step 2: Merchant verifies HTTP signature via OBA Verifier
   - Step 3: OBA Verifier fetches JWKS from OBA Registry
   - Step 4: Merchant verifies TAP object signatures
   - Step 5: Merchant calls Visa for authorization
   - Step 6: Success response back to Agent
4. **Completion**: Order number and transaction ID displayed

## Key Components

### Shopping Components

- **ProductGrid**: 2x4 grid with hover animations
- **ProductCard**: Individual product with add button
- **CartPanel**: Glass morphism side panel (380px → 300px locked)
- **CartItem**: Individual cart item with quantity

### Voice Components

- **VoiceInterface**: Floating avatar with transcript
- **AgentAvatar**: Animated avatar with speaking indicator
- **Transcript**: Last 3 messages displayed

### Diagram Components

- **SequenceDiagram**: SVG-based sequence visualization
- **Swimlane**: Individual participant column
- **SequenceStep**: Animated arrow with label
- **StepIndicator**: Progress bar showing completed/pending steps

### DevTools Components

- **DevToolsPanel**: 4-tab inspector
- **HTTPHeadersTab**: Signature headers display
- **ConsumerObjectTab**: agenticConsumer JSON
- **PaymentObjectTab**: agenticPaymentContainer JSON
- **RawRequestTab**: cURL-style request with copy button

## Design System

### Colors

- **Primary**: Dark navy (#1a1a2e)
- **Accent**: Sky blue (#0ea5e9)
- **Pete**: Blue (#3b82f6)
- **Penny**: Purple (#a855f7)
- **Status**: Emerald, amber, red, cyan

### Typography

- **Font**: Inter (UI) + Fira Code (code)
- **Sizes**: 32px (XL), 24px (LG), 16px (base), 14px (small)

### Animations

- **Fast**: 150ms ease
- **Base**: 300ms ease
- **Slow**: 500ms ease
- **Bounce**: 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)

## State Management

```typescript
interface AppState {
  phase: 'shopping' | 'transition' | 'checkout' | 'complete';
  activeAgent: 'pete' | 'penny';
  cart: {
    items: CartItem[];
    total: number;
    locked: boolean;
  };
  sequence: {
    expanded: boolean;
    steps: SequenceStep[];
    activeStep: number;
  };
  devtools: {
    visible: boolean;
    selectedTab: 'http' | 'consumer' | 'payment' | 'raw';
  };
}
```

## SSE Integration

The `useStepEvents` hook connects to the backend SSE stream and maps events to sequence steps:

```typescript
const { steps, activeStep } = useStepEvents();
```

Events automatically update:
- Sequence diagram (arrow animations)
- DevTools panel (header/object data)
- Step indicator (progress badges)

## Demo Video Optimization

**Recommended Screen Layout**:
- Main App: 60% (left side)
- Chrome DevTools: 40% (right side)

The UI is optimized for this split-screen demo format. Open Chrome DevTools and dock it to the right for the best recording setup.

## Development

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview build
pnpm preview
```

## License

Apache-2.0

