// App Phase State Machine
export type AppPhase = 'shopping' | 'transition' | 'checkout' | 'complete';
export type ActiveAgent = 'pete' | 'penny';

// Cart Types
export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// Checkout Types
export interface CheckoutSession {
  sessionId: string;
  checkoutId: string | null;
  consentGiven: boolean;
  consentTimestamp: number | null;
}

// Sequence Diagram Types
export type ParticipantType = 'agent' | 'merchant' | 'oba-verifier' | 'oba-registry' | 'visa';

export interface SequenceStep {
  id: string;
  from: ParticipantType;
  to: ParticipantType;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  timestamp?: number;
  data?: any;
}

// DevTools Types
export type DevToolsTab = 'http' | 'consumer' | 'payment' | 'raw';

export interface DevToolsData {
  httpHeaders: Record<string, string> | null;
  consumerObject: AgenticConsumer | null;
  paymentObject: AgenticPaymentContainer | null;
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

// App State
export interface AppState {
  phase: AppPhase;
  activeAgent: ActiveAgent;
  cart: {
    items: CartItem[];
    total: number;
    locked: boolean;
  };
  checkout: CheckoutSession;
  sequence: {
    visible: boolean;
    expanded: boolean;
    activeStep: number;
    steps: SequenceStep[];
  };
  devtools: {
    selectedTab: DevToolsTab;
    httpHeaders: Record<string, string> | null;
    consumerObject: AgenticConsumer | null;
    paymentObject: AgenticPaymentContainer | null;
  };
}

