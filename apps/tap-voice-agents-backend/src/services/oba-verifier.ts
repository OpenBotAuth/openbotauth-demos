import { OBAVerifyRequest, OBAVerifyResponse } from '../types.js';

export class OBAVerifier {
  constructor(private verifierUrl: string) {}

  async verifySignature(request: OBAVerifyRequest): Promise<OBAVerifyResponse> {
    try {
      // Extract only the signature-related headers
      const signatureHeaders: Record<string, string> = {
        'signature-input': request.headers['signature-input'] || '',
        'signature': request.headers['signature'] || '',
        'signature-agent': request.headers['signature-agent'] || '',
      };
      
      // Add content-type if it exists (in case it was signed)
      if (request.headers['content-type']) {
        signatureHeaders['content-type'] = request.headers['content-type'];
      }
      
      const verifyPayload = {
        method: request.method,
        url: request.url,
        headers: signatureHeaders,
      };

      const response = await fetch(this.verifierUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      });

      const data = await response.json() as {
        verified?: boolean;
        agent?: {
          id?: string;
          keyId?: string;
          publicKey?: string;
        };
        error?: string;
      };

      if (!response.ok) {
        return {
          verified: false,
          error: data.error || `Verifier returned ${response.status}`,
        };
      }

      // Extract public key from verifier response
      // The verifier returns agent info including the public key
      return {
        verified: data.verified || false,
        agentId: data.agent?.id,
        keyId: data.agent?.keyId,
        publicKey: data.agent?.publicKey,
        error: data.error,
      };
    } catch (error) {
      console.error('OBA verification error:', error);
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }
}

