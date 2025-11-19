/**
 * Configuration management
 */

import { config as loadEnv } from 'dotenv';
import type { Config } from './types.js';

// Load .env from multiple possible locations
loadEnv({ path: '.env' });
loadEnv({ path: '../../.env' });

/**
 * Load and validate configuration from environment
 */
export function loadConfig(): Config {
  const port = parseInt(process.env.WIDGET_PORT || '8089', 10);
  const privateKeyPem = process.env.OBA_PRIVATE_KEY_PEM || '';
  const keyId = process.env.OBA_KID || '';
  const signatureAgentUrl = process.env.OBA_SIGNATURE_AGENT_URL || '';
  const signedDefault = process.env.WIDGET_SIGNED_DEFAULT === 'true';

  // Validation
  const errors: string[] = [];

  if (!privateKeyPem) {
    errors.push('OBA_PRIVATE_KEY_PEM is required');
  } else if (!privateKeyPem.includes('BEGIN PRIVATE KEY')) {
    errors.push('OBA_PRIVATE_KEY_PEM must be in PEM format');
  }

  if (!keyId) {
    errors.push('OBA_KID is required');
  }

  if (!signatureAgentUrl) {
    errors.push('OBA_SIGNATURE_AGENT_URL is required');
  } else if (!signatureAgentUrl.startsWith('http')) {
    errors.push('OBA_SIGNATURE_AGENT_URL must be a valid URL');
  }

  if (errors.length > 0) {
    console.error('\n❌ Configuration errors:\n');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\n📝 Please check your .env file\n');
    process.exit(1);
  }

  return {
    port,
    privateKeyPem,
    keyId,
    signatureAgentUrl,
    signedDefault,
  };
}

