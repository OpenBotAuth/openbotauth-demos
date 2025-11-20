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

def find_matching_kid_in_jwks(jwks_url: str, public_key_pem: str) -> str | None:
    """Find the matching UUID KID in JWKS by matching the public key."""
    import json
    import urllib.request
    import base64
    
    try:
        # Extract base64 data from PEM
        pem_lines = public_key_pem.strip().split('\n')
        pem_data = ''.join(line for line in pem_lines 
                          if not line.startswith('-----'))
        
        # Decode the public key
        pub_key_bytes = base64.b64decode(pem_data)
        
        # Ed25519 public keys in SPKI format:
        # 30 2a (SEQUENCE, 42 bytes)
        # 30 05 (SEQUENCE, 5 bytes for algorithm)
        # 06 03 2b 65 70 (OID for Ed25519)
        # 03 21 00 (BIT STRING, 33 bytes)
        # [32 bytes of actual public key]
        
        # Extract the 32-byte Ed25519 key (last 32 bytes)
        if len(pub_key_bytes) >= 32:
            ed25519_key = pub_key_bytes[-32:]
            expected_x = base64.urlsafe_b64encode(ed25519_key).decode('utf-8').rstrip('=')
            
            print(f"  Looking for public key x coordinate: {expected_x[:20]}...")
            
            # Fetch JWKS
            with urllib.request.urlopen(jwks_url) as response:
                jwks = json.loads(response.read())
            
            # Find matching key by x coordinate
            for key in jwks.get('keys', []):
                if key.get('x') == expected_x:
                    print(f"  ✅ Found matching key in JWKS!")
                    return key.get('kid')
            
            print(f"  ⚠️  No matching public key found in JWKS")
            print(f"  This means the key hasn't been registered yet or registration failed")
        
        return None
    except Exception as e:
        print(f"⚠️  Warning: Could not match public key in JWKS: {e}")
        return None

def generate_env_file(keys: dict, output_path: str = '.env'):
    """Generate .env file from parsed keys."""
    # Try to find the correct UUID KID from JWKS by matching the public key
    kid_to_use = keys['kid']
    uuid_kid = find_matching_kid_in_jwks(keys['jwks_url'], keys['public_key'])
    
    if uuid_kid and uuid_kid != keys['kid']:
        print(f"\n⚠️  KID Mismatch Detected!")
        print(f"  Downloaded file has: {keys['kid']}")
        print(f"  JWKS actually has:   {uuid_kid}")
        print(f"  Using UUID format KID from JWKS...")
        kid_to_use = uuid_kid
    
    env_content = f'''# OpenBotAuth Configuration
# Auto-generated from OpenBotAuth key file

# Ed25519 private key in PEM format (PKCS8)
OBA_PRIVATE_KEY_PEM="{keys['private_key']}"

# Ed25519 public key in PEM format (SPKI)
OBA_PUBLIC_KEY_PEM="{keys['public_key']}"

# Key ID (corrected to match JWKS)
OBA_KID="{kid_to_use}"

# JWKS URL (Signature-Agent header value)
OBA_SIGNATURE_AGENT_URL="{keys['jwks_url']}"

# Demo URL
DEMO_URL="https://blog.attach.dev/?p=6"
'''
    
    Path(output_path).write_text(env_content)
    print(f"✅ Generated {output_path}")
    print(f"\nConfiguration:")
    print(f"  KID: {kid_to_use}")
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

