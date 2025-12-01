/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_API_KEY: string;
  readonly VITE_ELEVENLABS_CART_AGENT_ID: string;
  readonly VITE_ELEVENLABS_PAYMENT_AGENT_ID: string;
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

