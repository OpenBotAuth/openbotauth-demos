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

      console.log('\n🔐 [OBA Verifier] Calling OpenBotAuth Verifier Service');
      console.log('   URL:', this.verifierUrl);
      console.log('   Request Method:', request.method);
      console.log('   Request URL:', request.url);
      console.log('   Signature-Agent:', signatureHeaders['signature-agent']);
      console.log('   Signature-Input:', signatureHeaders['signature-input']);

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

      console.log('   Response Status:', response.status);
      console.log('   Response Body:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.log('   ❌ Verification FAILED:', data.error);
        return {
          verified: false,
          error: data.error || `Verifier returned ${response.status}`,
        };
      }

      console.log('   ✅ Verification SUCCESS');
      console.log('   Agent ID:', data.agent?.id);
      console.log('   Key ID:', data.agent?.keyId);
      console.log('');

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

