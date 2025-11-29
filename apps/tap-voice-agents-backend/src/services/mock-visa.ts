import { v4 as uuidv4 } from 'uuid';

export interface VisaAuthRequest {
  merchantId: string;
  amount: number;
  tokenHash: string;
  metadata?: any;
}

export interface VisaAuthResponse {
  approved: boolean;
  transactionId: string;
  authCode: string;
  timestamp: number;
  message?: string;
}

export class MockVisa {
  constructor(private alwaysApprove: boolean = true) {}

  async authorize(request: VisaAuthRequest): Promise<VisaAuthResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const transactionId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    const authCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    if (this.alwaysApprove) {
      return {
        approved: true,
        transactionId,
        authCode,
        timestamp: Date.now(),
        message: 'Payment authorized successfully',
      };
    }

    // Could add logic for conditional approval here
    return {
      approved: true,
      transactionId,
      authCode,
      timestamp: Date.now(),
    };
  }
}

