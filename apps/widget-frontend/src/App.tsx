import { useState } from 'react';
import { HeadersDiff } from './components/HeadersDiff';
import type { FetchResponse } from './types';

const DEFAULT_URL = 'https://blog.attach.dev/?p=6';

function App() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FetchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, signed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed');
      } else {
        setResponse(data);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: number): string => {
    if (status >= 200 && status < 300) return 'status-badge status-success';
    if (status >= 300 && status < 400) return 'status-badge status-warning';
    return 'status-badge status-error';
  };

  const isTeaser = (response: FetchResponse): boolean => {
    const decision = response.headers['x-oba-decision'];
    // Only TEASER if verifier explicitly set X-OBA-Decision: teaser
    return decision?.toLowerCase() === 'teaser';
  };

  const isFullContent = (response: FetchResponse): boolean => {
    const decision = response.headers['x-oba-decision'];
    // Only FULL if verifier explicitly set X-OBA-Decision: allow
    return decision?.toLowerCase() === 'allow';
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            OpenBotAuth Demo Widget
          </h1>
          <p className="text-purple-100">
            Compare unsigned vs signed HTTP requests (RFC 9421)
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Input Section */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://blog.attach.dev/?p=6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Mode
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSigned(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    !signed
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  🔓 Unsigned
                </button>
                <button
                  onClick={() => setSigned(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    signed
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  🔐 Signed
                </button>
              </div>
            </div>

            <button
              onClick={handleFetch}
              disabled={loading || !url}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <span className="text-xl">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Results Display */}
          {response && (
            <div className="space-y-6">
              {/* Summary Panel */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Response Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <span className={getStatusBadgeClass(response.status)}>
                      {response.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Size</div>
                    <div className="font-semibold text-gray-900">
                      {response.bytes.toLocaleString()} bytes
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Mode</div>
                    <div className="font-semibold text-gray-900">
                      {response.signed ? '🔐 Signed' : '🔓 Unsigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Decision</div>
                    <div className="font-semibold text-gray-900">
                      {response.headers['x-oba-decision'] ? (
                        <span className="uppercase">
                          {response.headers['x-oba-decision']}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Headers Diff */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Signature Headers
                </h3>
                <HeadersDiff response={response} />
              </div>

              {/* Body Preview */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Content Preview
                  </h3>
                  {isTeaser(response) && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                      [TEASER]
                    </span>
                  )}
                  {isFullContent(response) && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                      [FULL]
                    </span>
                  )}
                </div>
                <div className="p-4 bg-white rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {response.bodySnippet || '(empty)'}
                  {response.bodySnippet.length >= 400 && '...'}
                </div>
              </div>

              {/* Key Response Headers */}
              {response.headers['x-oba-decision'] && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-2">
                    OpenBotAuth Response Header
                  </div>
                  <div className="signature-header bg-white">
                    <span className="text-blue-700">X-OBA-Decision:</span>{' '}
                    {response.headers['x-oba-decision']}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-purple-100 text-sm">
          <p>
            Powered by{' '}
            <a
              href="https://github.com/hammadtq/openbotauth"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              OpenBotAuth
            </a>
            {' • '}
            <a
              href="https://www.rfc-editor.org/rfc/rfc9421.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              RFC 9421
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

