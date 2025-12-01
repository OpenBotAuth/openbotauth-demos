// Cart Types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartState {
  sessionId: string;
  items: CartItem[];
  createdAt: number;
  updatedAt: number;
}

// Checkout Types
export interface CheckoutSession {
  checkoutId: string;
  sessionId: string;
  userId?: string;
  total: number;
  nonce: string;          // Shared nonce for all TAP layers
  created: number;        // Unix timestamp
  expires: number;        // created + 480 seconds
  status: 'pending' | 'consent_captured' | 'payment_processing' | 'completed' | 'failed';
  consentId?: string;
}

// Consent Types
export interface ConsentProof {
  consentId: string;
  checkoutId: string;
  transcript: string;
  audioHash?: string;
  timestamp: number;
  verified: boolean;
}

// TAP Object Types
export interface AgenticConsumer {
  version: string;
  userId: string;
  consentProofId: string;
  nonce: string;
  created: number;
  expires: number;
  agentId: string;
  signature: string;
}

export interface AgenticPaymentContainer {
  version: string;
  tokenHash: string;
  amount: number;
  currency: string;
  merchantId: string;
  nonce: string;
  created: number;
  expires: number;
  agentId: string;
  signature: string;
}

// API Request/Response Types
export interface AddToCartRequest {
  sessionId: string;
  item: {
    id: number;
    name: string;
    price: number;
    quantity: number;
  };
}

export interface CheckoutInitiateRequest {
  sessionId: string;
  userId?: string;
}

export interface ConsentCaptureRequest {
  checkoutId: string;
  transcript: string;
  audioHash?: string;
  timestamp: number;
}

export interface ExecutePaymentRequest {
  checkoutId: string;
  paymentToken: string;
  userIdentifier: string;
}

// OBA Verifier Types
export interface OBAVerifyRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
}

export interface OBAVerifyResponse {
  verified: boolean;
  agentId?: string;
  keyId?: string;
  publicKey?: string;
  error?: string;
}

// SSE Event Types
export type SSEEventType = 'step_start' | 'step_complete' | 'step_error' | 'checkout_complete';

export interface SSEEvent {
  type: SSEEventType;
  stepId: string;
  phase: 'cart' | 'checkout' | 'payment' | 'verification' | 'authorization';
  timestamp: number;
  data?: any;
}

