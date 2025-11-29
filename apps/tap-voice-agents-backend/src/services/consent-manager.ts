import { ConsentProof } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage
const consents = new Map<string, ConsentProof>();

export class ConsentManager {
  static captureConsent(
    checkoutId: string,
    transcript: string,
    audioHash?: string
  ): ConsentProof {
    const consentId = uuidv4();
    const consent: ConsentProof = {
      consentId,
      checkoutId,
      transcript,
      audioHash,
      timestamp: Date.now(),
      verified: true,
    };
    
    consents.set(checkoutId, consent);
    return consent;
  }

  static getConsent(checkoutId: string): ConsentProof | null {
    return consents.get(checkoutId) || null;
  }

  static hasConsent(checkoutId: string): boolean {
    return consents.has(checkoutId);
  }

  static verifyConsentWindow(checkoutId: string, maxWindowSeconds: number): boolean {
    const consent = consents.get(checkoutId);
    if (!consent) return false;
    
    const ageSeconds = (Date.now() - consent.timestamp) / 1000;
    return ageSeconds <= maxWindowSeconds;
  }
}

