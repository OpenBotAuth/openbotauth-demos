#!/usr/bin/env node
/**
 * Parse OpenBotAuth key file and generate .env
 * Usage: node scripts/parse-keys.js path/to/key-file.txt
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function parseOpenBotAuthKeyFile(content) {
  const lines = content.split('\n');
  const result = {
    kid: '',
    privateKey: '',
    publicKey: '',
    jwksUrl: '',
  };

  let currentSection = '';
  let keyBuffer = [];

  for (const line of lines) {
    // Detect JWKS URL at top
    if (line.startsWith('JWKS URL:')) {
      result.jwksUrl = line.split('JWKS URL:')[1].trim();
      continue;
    }

    // Detect sections
    if (line.includes('KEY ID (KID)')) {
      currentSection = 'kid';
      continue;
    } else if (line.includes('PRIVATE KEY (Keep this secret!)')) {
      currentSection = 'privateKey';
      keyBuffer = [];
      continue;
    } else if (line.includes('PUBLIC KEY (PEM Format)')) {
      currentSection = 'publicKey';
      keyBuffer = [];
      continue;
    } else if (line.includes('PUBLIC KEY (Base64')) {
      // Skip Base64 section
      currentSection = '';
      continue;
    } else if (line.includes('==========')) {
      continue;
    }

    // Parse content
    if (currentSection === 'kid' && line.trim() && !line.includes('Use this')) {
      result.kid = line.trim();
    } else if (currentSection === 'privateKey') {
      if (line.includes('BEGIN PRIVATE KEY') || 
          line.includes('END PRIVATE KEY') || 
          line.trim().match(/^[A-Za-z0-9+/=]+$/)) {
        keyBuffer.push(line);
        if (line.includes('END PRIVATE KEY')) {
          result.privateKey = keyBuffer.join('\n');
          currentSection = '';
        }
      }
    } else if (currentSection === 'publicKey') {
      if (line.includes('BEGIN PUBLIC KEY') || 
          line.includes('END PUBLIC KEY') || 
          line.trim().match(/^[A-Za-z0-9+/=]+$/)) {
        keyBuffer.push(line);
        if (line.includes('END PUBLIC KEY')) {
          result.publicKey = keyBuffer.join('\n');
          currentSection = '';
        }
      }
    }
  }

  return result;
}

function generateEnvFile(keys, outputPath = '.env') {
  const envContent = `# OpenBotAuth Configuration
# Auto-generated from OpenBotAuth key file

# Ed25519 private key in PEM format (PKCS8)
OBA_PRIVATE_KEY_PEM="${keys.privateKey}"

# Ed25519 public key in PEM format (SPKI)
OBA_PUBLIC_KEY_PEM="${keys.publicKey}"

# Key ID
OBA_KID="${keys.kid}"

# JWKS URL (Signature-Agent header value)
OBA_SIGNATURE_AGENT_URL="${keys.jwksUrl}"

# Demo URL
DEMO_URL="https://blog.attach.dev/?p=6"

# Widget configuration
WIDGET_PORT=8089
WIDGET_SIGNED_DEFAULT=false
`;

  writeFileSync(outputPath, envContent, 'utf-8');
  console.log(`✅ Generated ${outputPath}`);
  console.log(`\nConfiguration:`);
  console.log(`  KID: ${keys.kid}`);
  console.log(`  JWKS URL: ${keys.jwksUrl}`);
  console.log(`\n🚀 You can now run:`);
  console.log(`  pnpm dev:widget-backend`);
  console.log(`  pnpm dev:widget-frontend`);
}

// Main
if (process.argv.length < 3) {
  console.error('Usage: node scripts/parse-keys.js <key-file.txt>');
  console.error('\nExample:');
  console.error('  node scripts/parse-keys.js ~/Downloads/openbotauth-keys-username.txt');
  process.exit(1);
}

const keyFilePath = resolve(process.argv[2]);
console.log(`📖 Reading key file: ${keyFilePath}`);

try {
  const content = readFileSync(keyFilePath, 'utf-8');
  const keys = parseOpenBotAuthKeyFile(content);
  
  // Validate
  if (!keys.kid || !keys.privateKey || !keys.publicKey || !keys.jwksUrl) {
    console.error('❌ Error: Could not parse all required fields from key file');
    console.error('Found:', {
      kid: !!keys.kid,
      privateKey: !!keys.privateKey,
      publicKey: !!keys.publicKey,
      jwksUrl: !!keys.jwksUrl,
    });
    console.error('\nMake sure the key file is in OpenBotAuth format.');
    process.exit(1);
  }
  
  generateEnvFile(keys);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

