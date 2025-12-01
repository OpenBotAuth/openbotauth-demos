import { CheckoutSession } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// In-memory storage
const checkoutSessions = new Map<string, CheckoutSession>();

export class CheckoutManager {
  static initiateCheckout(
    sessionId: string,
    total: number,
    userId?: string
  ): CheckoutSession {
    const checkoutId = uuidv4();
    const nonce = crypto.randomBytes(16).toString('base64url');
    const created = Math.floor(Date.now() / 1000);
    const expires = created + 480; // 8 minutes

    const checkout: CheckoutSession = {
      checkoutId,
      sessionId,
      userId,
      total,
      nonce,
      created,
      expires,
      status: 'pending',
    };

    checkoutSessions.set(checkoutId, checkout);
    return checkout;
  }

  static getCheckoutSession(checkoutId: string): CheckoutSession | null {
    return checkoutSessions.get(checkoutId) || null;
  }

  static updateStatus(checkoutId: string, status: CheckoutSession['status']): void {
    const session = checkoutSessions.get(checkoutId);
    if (session) {
      session.status = status;
    }
  }

  static setConsentId(checkoutId: string, consentId: string): void {
    const session = checkoutSessions.get(checkoutId);
    if (session) {
      session.consentId = consentId;
      session.status = 'consent_captured';
    }
  }

  static isExpired(checkoutId: string): boolean {
    const session = checkoutSessions.get(checkoutId);
    if (!session) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return now > session.expires;
  }

  static getMostRecentCheckoutBySession(sessionId: string): CheckoutSession | null {
    let mostRecent: CheckoutSession | null = null;
    
    for (const checkout of checkoutSessions.values()) {
      if (checkout.sessionId === sessionId) {
        if (!mostRecent || checkout.created > mostRecent.created) {
          mostRecent = checkout;
        }
      }
    }
    
    return mostRecent;
  }
}

