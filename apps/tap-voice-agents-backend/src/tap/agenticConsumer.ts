import crypto from 'crypto';
import { AgenticConsumer } from '../types.js';

export async function buildAgenticConsumer(
  userId: string,
  consentProofId: string,
  nonce: string,
  created: number,
  expires: number,
  agentId: string,
  privateKeyPem: string
): Promise<AgenticConsumer> {
  const unsigned: Omit<AgenticConsumer, 'signature'> = {
    version: '1.0',
    userId,
    consentProofId,
    nonce,
    created,
    expires,
    agentId,
  };

  const signature = await signObject('agentic-consumer', unsigned, privateKeyPem);

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

