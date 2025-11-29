#!/bin/bash

echo "🚀 Starting Cloudflare Tunnel for TAP Voice Agents Backend..."
echo ""
echo "Backend should be running on http://localhost:8090"
echo ""
echo "Starting tunnel..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cloudflared tunnel --url http://localhost:8090

# The tunnel URL will be displayed in the output above
# Look for a line like: "Your quick Tunnel has been created! Visit it at:"
# Copy that URL and use it in your ElevenLabs webhook configuration

