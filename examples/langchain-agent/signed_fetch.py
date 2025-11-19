"""
RFC 9421 HTTP Message Signatures for OpenBotAuth (Ed25519)

This module provides functions to sign HTTP requests using Ed25519 private keys
and RFC 9421 HTTP Message Signatures format.
"""

import base64
import secrets
import time
from typing import Dict, Tuple
from urllib.parse import urlparse

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519


def parse_pem_private_key(pem: str) -> ed25519.Ed25519PrivateKey:
    """
    Parse Ed25519 private key from PEM format.
    
    Args:
        pem: Private key in PEM format (PKCS8)
    
    Returns:
        Ed25519PrivateKey object
    """
    key = serialization.load_pem_private_key(
        pem.encode('utf-8'),
        password=None
    )
    if not isinstance(key, ed25519.Ed25519PrivateKey):
        raise ValueError("Key must be Ed25519")
    return key


def generate_nonce() -> str:
    """
    Generate a random nonce for replay protection.
    
    Returns:
        Base64url-encoded 16-byte nonce (no padding)
    """
    nonce_bytes = secrets.token_bytes(16)
    return base64.urlsafe_b64encode(nonce_bytes).decode('utf-8').rstrip('=')


def normalize_authority(url: str) -> str:
    """
    Normalize authority by stripping default ports.
    
    Args:
        url: Full URL
    
    Returns:
        Normalized authority (host or host:port)
    """
    parsed = urlparse(url)
    
    # Strip default ports
    if (parsed.scheme == 'https' and parsed.port == 443) or \
       (parsed.scheme == 'http' and parsed.port == 80):
        return parsed.hostname or ''
    
    # Keep non-default ports
    if parsed.port:
        return f"{parsed.hostname}:{parsed.port}"
    
    return parsed.hostname or ''


def build_signature_base(
    method: str,
    url: str,
    created: int,
    expires: int,
    nonce: str,
    kid: str,
    headers: Dict[str, str] = None
) -> Tuple[str, str]:
    """
    Build RFC 9421 signature base string and Signature-Input header.
    
    Args:
        method: HTTP method (e.g., GET, POST)
        url: Full URL
        created: Unix timestamp for signature creation
        expires: Unix timestamp for signature expiration
        nonce: Nonce for replay protection
        kid: Key identifier
        headers: Optional dict of extra headers to include in signature
    
    Returns:
        Tuple of (signature_base, signature_input_header)
    """
    parsed = urlparse(url)
    
    # Normalize authority (strip default ports)
    authority = normalize_authority(url)
    
    # Path + query
    path = parsed.path + ('?' + parsed.query if parsed.query else '')
    
    # Components to sign (in this exact order per RFC 9421)
    components = ['@method', '@authority', '@path']
    
    # Build signature base lines
    lines = [
        f'"@method": {method.upper()}',
        f'"@authority": {authority}',
        f'"@path": {path}',
    ]
    
    # Add extra headers if provided
    if headers:
        for header_name in headers:
            components.append(header_name.lower())
            lines.append(f'"{header_name.lower()}": {headers[header_name]}')
    
    # Build @signature-params line
    component_list = ' '.join(f'"{c}"' for c in components)
    signature_params = (
        f'({component_list});'
        f'created={created};'
        f'expires={expires};'
        f'nonce="{nonce}";'
        f'keyid="{kid}";'
        f'alg="ed25519"'
    )
    
    lines.append(f'"@signature-params": {signature_params}')
    
    # Join with newlines
    signature_base = '\n'.join(lines)
    
    # Build Signature-Input header
    signature_input = f'sig1={signature_params}'
    
    return signature_base, signature_input


def sign_ed25519(message: str, private_key_pem: str) -> str:
    """
    Sign a message using Ed25519 private key.
    
    Args:
        message: Message to sign (UTF-8 string)
        private_key_pem: Ed25519 private key in PEM format
    
    Returns:
        Signature as base64 string (NOT base64url, per RFC 9421)
    """
    private_key = parse_pem_private_key(private_key_pem)
    
    # Sign the message
    message_bytes = message.encode('utf-8')
    signature_bytes = private_key.sign(message_bytes)
    
    # Return base64-encoded signature (NOT base64url)
    return base64.b64encode(signature_bytes).decode('utf-8')


def make_signed_headers(
    method: str,
    url: str,
    kid: str,
    sig_agent_url: str,
    privkey_pem: str,
    created: int = None,
    expires: int = None,
    nonce: str = None,
    extra_headers: Dict[str, str] = None
) -> Dict[str, str]:
    """
    Generate signed headers for an HTTP request.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        url: Full URL to request
        kid: Key identifier
        sig_agent_url: Signature-Agent URL (JWKS endpoint)
        privkey_pem: Ed25519 private key in PEM format
        created: Unix timestamp (default: now)
        expires: Unix timestamp (default: created + 300s)
        nonce: Nonce (default: auto-generated)
        extra_headers: Optional dict of headers to include in signature
    
    Returns:
        Dict of headers to add to the request
    """
    # Set defaults
    if created is None:
        created = int(time.time())
    if expires is None:
        expires = created + 300
    if nonce is None:
        nonce = generate_nonce()
    
    # Validate window
    window = expires - created
    if window > 300:
        raise ValueError(f"Signature window too large: {window}s (max 300s)")
    if window <= 0:
        raise ValueError("Expires must be after created")
    
    # Build signature base
    signature_base, signature_input = build_signature_base(
        method=method,
        url=url,
        created=created,
        expires=expires,
        nonce=nonce,
        kid=kid,
        headers=extra_headers
    )
    
    # Sign the base string
    signature = sign_ed25519(signature_base, privkey_pem)
    
    # Build headers
    headers = {
        'Signature-Input': signature_input,
        'Signature': f'sig1=:{signature}:',
        'Signature-Agent': sig_agent_url,
        'User-Agent': 'OpenBotAuth-Demo-Agent/0.1.0',
    }
    
    return headers


if __name__ == '__main__':
    # Test with example values
    print("Testing RFC 9421 signing...")
    
    # This is a test key - NEVER use in production!
    test_private_key = """-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJ+DYvh6SEqVTm50DFtMDoQikTmiCqirVv9mWG9qfSnF
-----END PRIVATE KEY-----"""
    
    headers = make_signed_headers(
        method='GET',
        url='https://blog.attach.dev/?p=6',
        kid='test-key-001',
        sig_agent_url='https://registry.example.com/jwks/test.json',
        privkey_pem=test_private_key,
        created=1700000000,
        expires=1700000300,
        nonce='test-nonce-123'
    )
    
    print("\nGenerated headers:")
    for key, value in headers.items():
        print(f"{key}: {value}")

