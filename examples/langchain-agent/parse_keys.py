#!/usr/bin/env python3
"""
Parse OpenBotAuth key file and generate .env
Usage: python parse_keys.py path/to/key-file.txt
"""

import sys
import re
from pathlib import Path

def parse_openbotauth_key_file(content: str) -> dict:
    """Parse OpenBotAuth key file format."""
    result = {
        'kid': '',
        'private_key': '',
        'public_key': '',
        'jwks_url': '',
    }
    
    lines = content.split('\n')
    current_section = ''
    key_buffer = []
    
    for line in lines:
        # Detect JWKS URL at top
        if line.startswith('JWKS URL:'):
            result['jwks_url'] = line.split('JWKS URL:')[1].strip()
            continue
        
        # Detect sections
        if 'KEY ID (KID)' in line:
            current_section = 'kid'
            continue
        elif 'PRIVATE KEY (Keep this secret!)' in line:
            current_section = 'private_key'
            key_buffer = []
            continue
        elif 'PUBLIC KEY (PEM Format)' in line:
            current_section = 'public_key'
            key_buffer = []
            continue
        elif '============' in line:
            continue
        
        # Parse content
        if current_section == 'kid' and line.strip() and 'Use this KID' not in line:
            result['kid'] = line.strip()
        elif current_section == 'private_key':
            if 'BEGIN PRIVATE KEY' in line or 'END PRIVATE KEY' in line or \
               re.match(r'^[A-Za-z0-9+/=]+$', line.strip()):
                key_buffer.append(line)
                if 'END PRIVATE KEY' in line:
                    result['private_key'] = '\n'.join(key_buffer)
                    current_section = ''
        elif current_section == 'public_key':
            if 'BEGIN PUBLIC KEY' in line or 'END PUBLIC KEY' in line or \
               re.match(r'^[A-Za-z0-9+/=]+$', line.strip()):
                key_buffer.append(line)
                if 'END PUBLIC KEY' in line:
                    result['public_key'] = '\n'.join(key_buffer)
                    current_section = ''
    
    return result

def generate_env_file(keys: dict, output_path: str = '.env'):
    """Generate .env file from parsed keys."""
    env_content = f'''# OpenBotAuth Configuration
# Auto-generated from OpenBotAuth key file

# Ed25519 private key in PEM format (PKCS8)
OBA_PRIVATE_KEY_PEM="{keys['private_key']}"

# Ed25519 public key in PEM format (SPKI)
OBA_PUBLIC_KEY_PEM="{keys['public_key']}"

# Key ID
OBA_KID="{keys['kid']}"

# JWKS URL (Signature-Agent header value)
OBA_SIGNATURE_AGENT_URL="{keys['jwks_url']}"

# Demo URL
DEMO_URL="https://blog.attach.dev/?p=6"
'''
    
    Path(output_path).write_text(env_content)
    print(f"✅ Generated {output_path}")
    print(f"\nConfiguration:")
    print(f"  KID: {keys['kid']}")
    print(f"  JWKS URL: {keys['jwks_url']}")
    print(f"\n🚀 You can now run:")
    print(f"  python demo_agent.py --mode unsigned")
    print(f"  python demo_agent.py --mode signed")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python parse_keys.py <key-file.txt>')
        print('\nExample:')
        print('  python parse_keys.py ~/Downloads/openbotauth-keys-username.txt')
        sys.exit(1)
    
    key_file_path = Path(sys.argv[1])
    print(f"📖 Reading key file: {key_file_path}")
    
    try:
        content = key_file_path.read_text()
        keys = parse_openbotauth_key_file(content)
        
        # Validate
        if not all([keys['kid'], keys['private_key'], keys['public_key'], keys['jwks_url']]):
            print('❌ Error: Could not parse all required fields from key file')
            print('Found:', {k: bool(v) for k, v in keys.items()})
            print('\nMake sure the key file is in OpenBotAuth format.')
            sys.exit(1)
        
        generate_env_file(keys)
    except Exception as e:
        print(f'❌ Error: {e}')
        sys.exit(1)

