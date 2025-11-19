# Widget Frontend

React + Vite frontend for the OpenBotAuth demo widget.

## Features

- ✅ Clean, modern UI with Tailwind CSS
- ✅ URL input with default demo site
- ✅ Unsigned/Signed toggle
- ✅ Live fetch results
- ✅ Headers diff (shows signature headers when signed)
- ✅ Body preview with [TEASER]/[FULL] indicators
- ✅ Response summary panel
- ✅ Mobile responsive

## Prerequisites

The frontend requires the widget backend to be running. Make sure you've configured your keys first:

### 🚀 Quick Setup (Automatic)

```bash
# From repository root - parse your OpenBotAuth key file
node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt
# This generates .env with all required configuration
```

### Manual Setup

See [Widget Backend README](../widget-backend/README.md) for configuration details.

## Installation

```bash
pnpm install
```

## Development

```bash
# Terminal 1: Start backend (from root)
pnpm dev:widget-backend

# Terminal 2: Start frontend (from root)
pnpm dev:widget-frontend
```

Frontend runs on `http://localhost:5174`

The Vite dev server proxies `/api/*` requests to the backend at `localhost:8089`.

## Production Build

```bash
pnpm build
pnpm preview
```

## Usage

1. **Enter URL**: Target URL with OpenBotAuth plugin (default: `https://blog.attach.dev/?p=6`)
2. **Select Mode**: Toggle between Unsigned (🔓) and Signed (🔐)
3. **Fetch**: Click the Fetch button
4. **View Results**:
   - Status code and response size
   - `X-OBA-Decision` header if present
   - Signature headers diff (when signed)
   - Content preview with teaser/full indicator
   - Signature trace (created, expires, keyId)

## Components

### `App.tsx`

Main application component with:
- URL input field
- Unsigned/Signed toggle buttons
- Fetch button
- Results display panels
- Error handling

### `components/HeadersDiff.tsx`

Displays signature-related headers with formatting:
- `Signature-Input` - Signature parameters
- `Signature` - Base64-encoded signature
- `Signature-Agent` - JWKS URL
- Signature trace panel (created/expires/keyId)

## Styling

Uses Tailwind CSS with custom styles for:
- Gradient background
- Card shadows
- Status badges (success/warning/error)
- Code blocks (`.signature-header`)
- Responsive layout

## API Integration

Frontend calls backend API at `/api/fetch`:

```typescript
const response = await fetch('/api/fetch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, signed }),
});
```

## Screenshots

```
┌─────────────────────────────────────┐
│  OpenBotAuth Demo Widget           │
│  Compare unsigned vs signed         │
├─────────────────────────────────────┤
│  Target URL: [________________]     │
│                                     │
│  [ 🔓 Unsigned ] [ 🔐 Signed ]     │
│                                     │
│  [      Fetch      ]                │
├─────────────────────────────────────┤
│  Response Summary                   │
│  Status: 200   Size: 15,234 bytes   │
│  Mode: 🔐 Signed                    │
│  Decision: ALLOW                    │
├─────────────────────────────────────┤
│  Signature Headers                  │
│  ✓ Added Signature Headers          │
│  Signature-Input: sig1=(...)        │
│  Signature: sig1=:abc123...:        │
│  Signature-Agent: https://...       │
├─────────────────────────────────────┤
│  Content Preview        [FULL]      │
│  Lorem ipsum dolor sit amet...      │
└─────────────────────────────────────┘
```

## Tech Stack

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- Fetch API

## License

Apache-2.0

