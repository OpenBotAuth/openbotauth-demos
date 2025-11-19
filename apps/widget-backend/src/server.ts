/**
 * OpenBotAuth Widget Backend Server
 * 
 * Provides /api/fetch endpoint for unsigned and signed HTTP requests
 */

import express from 'express';
import cors from 'cors';
import { makeSignedHeaders } from '@oba-demos/signing-ts';
import { loadConfig } from './config.js';
import { redactHeaders, logRequest, logStartup } from './logger.js';
import type { FetchRequest, FetchResponse } from './types.js';

const config = loadConfig();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * POST /api/fetch - Perform unsigned or signed fetch
 */
app.post('/api/fetch', async (req, res) => {
  const startTime = Date.now();
  let status = 500;
  let error: string | undefined;

  try {
    const body = req.body as FetchRequest;

    // Validate request
    if (!body.url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    let url: URL;
    try {
      url = new URL(body.url);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    const signed = body.signed ?? config.signedDefault;
    const method = 'GET';

    // Build headers
    let headers: Record<string, string> = {
      'User-Agent': 'OpenBotAuth-Widget/0.1.0',
      ...body.extraHeaders,
    };

    let trace: FetchResponse['trace'] | undefined;

    // Add signature if requested
    if (signed) {
      const now = Math.floor(Date.now() / 1000);
      const created = now;
      const expires = now + 300;

      const signedHeaders = await makeSignedHeaders(
        method,
        body.url,
        {
          privateKeyPem: config.privateKeyPem,
          keyId: config.keyId,
          signatureAgentUrl: config.signatureAgentUrl,
          created,
          expires,
        }
      );

      headers = { ...headers, ...signedHeaders };

      trace = {
        created,
        expires,
        keyId: config.keyId,
        signatureInput: signedHeaders['Signature-Input'],
      };
    }

    // Perform fetch
    const fetchResponse = await fetch(body.url, {
      method,
      headers,
      redirect: 'manual', // Handle redirects manually to re-sign if needed
      signal: AbortSignal.timeout(30000), // 30s timeout (some origins can be slow)
    });

    status = fetchResponse.status;

    // Handle redirects by re-signing for the new URL
    if (status >= 300 && status < 400 && signed) {
      const location = fetchResponse.headers.get('location');
      if (location) {
        const redirectUrl = new URL(location, body.url).toString();
        console.log(`  ↪️  Redirect to: ${redirectUrl} (will re-sign)`);

        // Re-sign for new URL
        const now = Math.floor(Date.now() / 1000);
        const redirectHeaders = await makeSignedHeaders(
          method,
          redirectUrl,
          {
            privateKeyPem: config.privateKeyPem,
            keyId: config.keyId,
            signatureAgentUrl: config.signatureAgentUrl,
            created: now,
            expires: now + 300,
          }
        );

        // Follow redirect with new signature
        const redirectResponse = await fetch(redirectUrl, {
          method,
          headers: { ...headers, ...redirectHeaders },
          signal: AbortSignal.timeout(30000),
        });

        status = redirectResponse.status;
        const responseBody = await redirectResponse.text();
        const bytes = new Blob([responseBody]).size;

        const response: FetchResponse = {
          status,
          bytes,
          headers: Object.fromEntries(redirectResponse.headers.entries()),
          bodySnippet: stripHtml(responseBody).slice(0, 400),
          signed,
          request: {
            method,
            url: redirectUrl,
            headers: redactHeaders(headers),
          },
          trace,
        };

        logRequest(method, body.url, status, Date.now() - startTime, signed);
        res.json(response);
        return;
      }
    }

    // Read response body
    const responseBody = await fetchResponse.text();
    const bytes = new Blob([responseBody]).size;

    // Build response
    const response: FetchResponse = {
      status,
      bytes,
      headers: Object.fromEntries(fetchResponse.headers.entries()),
      bodySnippet: stripHtml(responseBody).slice(0, 400),
      signed,
      request: {
        method,
        url: body.url,
        headers: redactHeaders(headers),
      },
      trace,
    };

    logRequest(method, body.url, status, Date.now() - startTime, signed);
    res.json(response);
  } catch (err: any) {
    error = err.message || 'Internal server error';
    console.error('Fetch error:', err);
    
    logRequest('POST', '/api/fetch', status, Date.now() - startTime, false, error);
    
    res.status(500).json({
      error,
      signed: false,
    } as FetchResponse);
  }
});

/**
 * GET /healthz - Health check
 */
app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasKeys: !!config.privateKeyPem,
  });
});

/**
 * GET / - API info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'OpenBotAuth Widget Backend',
    version: '0.1.0',
    endpoints: {
      fetch: 'POST /api/fetch',
      health: 'GET /healthz',
    },
    documentation: 'https://github.com/hammadtq/openbotauth-demos',
  });
});

// Start server
app.listen(config.port, () => {
  logStartup(config.port, !!config.privateKeyPem);
});

