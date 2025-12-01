import crypto from 'crypto';
import { AgenticPaymentContainer } from '../types.js';

export async function buildAgenticPaymentContainer(
  tokenHash: string,
  amount: number,
  merchantId: string,
  nonce: string,
  created: number,
  expires: number,
  agentId: string,
  privateKeyPem: string
): Promise<AgenticPaymentContainer> {
  const unsigned: Omit<AgenticPaymentContainer, 'signature'> = {
    version: '1.0',
    tokenHash,
    amount,
    currency: 'USD',
    merchantId,
    nonce,
    created,
    expires,
    agentId,
  };

  const signature = await signObject('agentic-payment', unsigned, privateKeyPem);

  return {
    ...unsigned,
    signature,
  };
}

async function signObject(
  prefix: string,
  obj: any,
  privateKeyPem: string
): Promise<string> {
  // Create canonical JSON (sorted keys, no whitespace)
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  const signatureBase = `${prefix}:${canonical}`;

  // Convert PEM to KeyObject and sign with Ed25519
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(signatureBase), privateKey);
  return signature.toString('base64');
}

