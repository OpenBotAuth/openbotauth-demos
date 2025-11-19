/**
 * Simple request logger with signature redaction
 */

/**
 * Redact sensitive values in headers
 */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey === 'signature') {
      // Redact signature value beyond first 10 chars
      const match = value.match(/^(sig1=:[^:]{10})/);
      redacted[key] = match ? `${match[1]}...[REDACTED]:` : '[REDACTED]';
    } else if (lowerKey.includes('authorization') || lowerKey.includes('cookie')) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Log request with timing
 */
export function logRequest(
  method: string,
  url: string,
  status: number,
  durationMs: number,
  signed: boolean,
  error?: string
): void {
  const timestamp = new Date().toISOString();
  const signedLabel = signed ? '🔐 SIGNED' : '🔓 UNSIGNED';
  const statusEmoji = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
  
  console.log(
    `${timestamp} ${statusEmoji} ${method} ${url} → ${status} (${durationMs}ms) ${signedLabel}`
  );
  
  if (error) {
    console.error(`  ⚠️  Error: ${error}`);
  }
}

/**
 * Format startup banner
 */
export function logStartup(port: number, hasKeys: boolean): void {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 OpenBotAuth Widget Backend');
  console.log('='.repeat(60));
  console.log(`📡 Server:    http://localhost:${port}`);
  console.log(`🔑 Keys:      ${hasKeys ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`📊 Health:    http://localhost:${port}/healthz`);
  console.log(`🎯 Endpoint:  POST /api/fetch`);
  console.log('='.repeat(60) + '\n');
}

