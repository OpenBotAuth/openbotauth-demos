import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  // Server
  port: number;
  frontendUrl: string;
  publicUrl: string;

  // OpenBotAuth
  obaPrivateKeyPem: string;
  obaPublicKeyPem: string;
  obaKid: string;
  obaSignatureAgentUrl: string;
  obaVerifierUrl: string;

  // ElevenLabs
  elevenlabsApiKey: string;
  elevenlabsCartAgentId: string;
  elevenlabsPaymentAgentId: string;

  // Mock Visa
  mockVisaMerchantId: string;
  mockVisaAlwaysApprove: boolean;

  // Session & Security
  sessionMaxAgeMs: number;
  consentWindowSeconds: number;
}

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export function loadConfig(): Config {
  return {
    port: parseInt(getEnvVar('PORT', false) || '8090', 10),
    frontendUrl: getEnvVar('FRONTEND_URL', false) || 'http://localhost:5175',
    publicUrl: getEnvVar('PUBLIC_URL', false) || `http://localhost:${getEnvVar('PORT', false) || '8090'}`,

    obaPrivateKeyPem: getEnvVar('OBA_PRIVATE_KEY_PEM'),
    obaPublicKeyPem: getEnvVar('OBA_PUBLIC_KEY_PEM'),
    obaKid: getEnvVar('OBA_KID'),
    obaSignatureAgentUrl: getEnvVar('OBA_SIGNATURE_AGENT_URL'),
    obaVerifierUrl: getEnvVar('OBA_VERIFIER_URL', false) || 'https://verifier.openbotauth.org/verify',

    elevenlabsApiKey: getEnvVar('ELEVENLABS_API_KEY', false),
    elevenlabsCartAgentId: getEnvVar('ELEVENLABS_CART_AGENT_ID', false),
    elevenlabsPaymentAgentId: getEnvVar('ELEVENLABS_PAYMENT_AGENT_ID', false),

    mockVisaMerchantId: getEnvVar('MOCK_VISA_MERCHANT_ID', false) || 'DEMO_MERCHANT_001',
    mockVisaAlwaysApprove: getEnvVar('MOCK_VISA_ALWAYS_APPROVE', false) === 'true',

    sessionMaxAgeMs: parseInt(getEnvVar('SESSION_MAX_AGE_MS', false) || '480000', 10),
    consentWindowSeconds: parseInt(getEnvVar('CONSENT_WINDOW_SECONDS', false) || '480', 10),
  };
}

