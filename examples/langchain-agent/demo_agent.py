#!/usr/bin/env python3
"""
OpenBotAuth Demo Agent

Demonstrates unsigned vs signed HTTP requests using RFC 9421.
Shows how agents with cryptographic identities get full content,
while unsigned agents receive teasers or 402 responses.
"""

import argparse
import os
import sys
from typing import Dict, Optional

import httpx
from dotenv import load_dotenv

from signed_fetch import make_signed_headers


def load_config() -> Dict[str, str]:
    """Load configuration from environment."""
    load_dotenv()
    
    config = {
        'private_key_pem': os.getenv('OBA_PRIVATE_KEY_PEM', ''),
        'kid': os.getenv('OBA_KID', ''),
        'sig_agent_url': os.getenv('OBA_SIGNATURE_AGENT_URL', ''),
        'demo_url': os.getenv('DEMO_URL', 'https://blog.attach.dev/?p=6'),
    }
    
    return config


def fetch_unsigned(url: str) -> httpx.Response:
    """
    Perform an unsigned HTTP request.
    
    Args:
        url: URL to fetch
    
    Returns:
        httpx Response object
    """
    headers = {
        'User-Agent': 'OpenBotAuth-Demo-Agent/0.1.0 (unsigned)',
    }
    
    with httpx.Client(follow_redirects=False, timeout=10.0) as client:
        response = client.get(url, headers=headers)
    
    return response


def fetch_signed(url: str, config: Dict[str, str]) -> httpx.Response:
    """
    Perform a signed HTTP request using RFC 9421.
    
    Args:
        url: URL to fetch
        config: Configuration dict with keys
    
    Returns:
        httpx Response object
    """
    # Generate signed headers
    signed_headers = make_signed_headers(
        method='GET',
        url=url,
        kid=config['kid'],
        sig_agent_url=config['sig_agent_url'],
        privkey_pem=config['private_key_pem'],
    )
    
    # Perform request
    with httpx.Client(follow_redirects=False, timeout=10.0) as client:
        response = client.get(url, headers=signed_headers)
        
        # Handle redirects by re-signing for the new URL
        if 300 <= response.status_code < 400:
            location = response.headers.get('location')
            if location:
                # Make location absolute
                if location.startswith('/'):
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    location = f"{parsed.scheme}://{parsed.netloc}{location}"
                
                print(f"  ↪️  Redirect to: {location} (re-signing...)")
                
                # Re-sign for new URL
                new_signed_headers = make_signed_headers(
                    method='GET',
                    url=location,
                    kid=config['kid'],
                    sig_agent_url=config['sig_agent_url'],
                    privkey_pem=config['private_key_pem'],
                )
                
                # Follow redirect
                response = client.get(location, headers=new_signed_headers)
    
    return response


def print_response(response: httpx.Response, mode: str):
    """
    Print response details in a formatted way.
    
    Args:
        response: httpx Response object
        mode: 'unsigned' or 'signed'
    """
    mode_label = '🔓 UNSIGNED' if mode == 'unsigned' else '🔐 SIGNED'
    
    print("\n" + "=" * 70)
    print(f"  {mode_label} REQUEST")
    print("=" * 70)
    
    # Status
    status_emoji = '✅' if 200 <= response.status_code < 300 else '⚠️' if 400 <= response.status_code < 500 else '❌'
    print(f"\n{status_emoji} Status: {response.status_code} {response.reason_phrase}")
    
    # Size
    body_bytes = len(response.content)
    print(f"📦 Size: {body_bytes:,} bytes")
    
    # Key headers
    print(f"\n📋 Key Headers:")
    
    oba_decision = response.headers.get('x-oba-decision')
    if oba_decision:
        print(f"  • X-OBA-Decision: {oba_decision.upper()}")
    
    content_type = response.headers.get('content-type', 'unknown')
    print(f"  • Content-Type: {content_type}")
    
    # If signed, show signature headers that were sent
    if mode == 'signed':
        sig_input = response.request.headers.get('signature-input')
        if sig_input:
            # Truncate long signature input
            if len(sig_input) > 80:
                sig_input = sig_input[:77] + '...'
            print(f"  • Signature-Input: {sig_input}")
        
        sig_agent = response.request.headers.get('signature-agent')
        if sig_agent:
            print(f"  • Signature-Agent: {sig_agent}")
    
    # Body preview
    print(f"\n📄 Content Preview (first 200 chars):")
    print("-" * 70)
    
    try:
        # Strip HTML tags for readability
        import re
        text = response.text
        text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        preview = text[:200]
        
        # Determine if teaser or full based on actual response, not mode assumptions
        content_label = ''
        if oba_decision == 'teaser':
            content_label = '[TEASER - Policy Enforced]'
        elif oba_decision == 'allow':
            content_label = '[FULL - Policy Allowed]'
        elif oba_decision == 'deny':
            content_label = '[DENIED]'
        elif response.status_code == 402:
            content_label = '[PAYMENT REQUIRED]'
        elif body_bytes < 5000 and response.status_code == 200:
            content_label = '[TEASER - Small Response]'
        else:
            # No clear indication - report what we know
            if mode == 'signed':
                content_label = '[⚠️  FULL CONTENT - Plugin not enforcing policies (missing X-OBA-Decision)]'
            else:
                content_label = '[⚠️  FULL CONTENT - Plugin not enforcing policies (missing X-OBA-Decision)]'
        
        print(f"{preview}{'...' if len(text) > 200 else ''}")
        print(f"\n{content_label}")
        
    except Exception as e:
        print(f"(Could not decode body: {e})")
    
    print("-" * 70)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='OpenBotAuth Demo Agent - Compare unsigned vs signed requests',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Unsigned request (gets teaser or 402)
  python demo_agent.py --mode unsigned
  
  # Signed request (gets full content)
  python demo_agent.py --mode signed
  
  # Custom URL
  python demo_agent.py --mode signed --url https://example.com/protected
        """
    )
    
    parser.add_argument(
        '--mode',
        choices=['unsigned', 'signed'],
        required=True,
        help='Request mode: unsigned (teaser) or signed (full access)'
    )
    
    parser.add_argument(
        '--url',
        type=str,
        help='URL to fetch (default: from DEMO_URL env var)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show additional debug information'
    )
    
    args = parser.parse_args()
    
    # Load config
    config = load_config()
    url = args.url or config['demo_url']
    
    if not url:
        print("❌ Error: No URL specified. Use --url or set DEMO_URL in .env")
        sys.exit(1)
    
    # Validate config for signed mode
    if args.mode == 'signed':
        errors = []
        if not config['private_key_pem']:
            errors.append("OBA_PRIVATE_KEY_PEM not set")
        if not config['kid']:
            errors.append("OBA_KID not set")
        if not config['sig_agent_url']:
            errors.append("OBA_SIGNATURE_AGENT_URL not set")
        
        if errors:
            print("❌ Configuration errors for signed mode:")
            for error in errors:
                print(f"  • {error}")
            print("\nPlease check your .env file")
            sys.exit(1)
    
    print(f"\n🎯 Target URL: {url}")
    
    # Perform fetch
    try:
        if args.mode == 'unsigned':
            response = fetch_unsigned(url)
        else:
            response = fetch_signed(url, config)
        
        # Print results
        print_response(response, args.mode)
        
        # Exit code based on result
        if response.status_code == 200:
            oba_decision = response.headers.get('x-oba-decision', '')
            if oba_decision == 'allow' or args.mode == 'signed':
                sys.exit(0)  # Full access
            else:
                sys.exit(2)  # Teaser
        elif response.status_code == 402:
            sys.exit(2)  # Payment required
        else:
            sys.exit(1)  # Error
            
    except httpx.TimeoutException:
        print("\n❌ Error: Request timed out")
        sys.exit(1)
    except httpx.RequestError as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

