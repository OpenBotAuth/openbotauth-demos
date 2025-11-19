import type { FetchResponse } from '../types';

interface Props {
  response: FetchResponse;
}

export function HeadersDiff({ response }: Props) {
  const signatureHeaders = [
    'Signature-Input',
    'Signature',
    'Signature-Agent',
  ];

  const hasSignatureHeaders = signatureHeaders.some(
    h => response.request.headers[h]
  );

  if (!response.signed || !hasSignatureHeaders) {
    return (
      <div className="text-gray-600 italic">
        No signature headers (unsigned request)
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <span className="text-green-600">✓</span>
        Added Signature Headers
      </div>

      {signatureHeaders.map(headerName => {
        const value = response.request.headers[headerName];
        if (!value) return null;

        return (
          <div key={headerName} className="space-y-1">
            <div className="text-sm font-semibold text-gray-700">
              {headerName}
            </div>
            <div className="signature-header break-all">
              {value}
            </div>
          </div>
        );
      })}

      {response.trace && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs font-semibold text-blue-900 mb-2">
            Signature Trace
          </div>
          <div className="space-y-1 text-xs text-blue-800">
            <div>
              <span className="font-medium">Key ID:</span> {response.trace.keyId}
            </div>
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(response.trace.created * 1000).toISOString()}
            </div>
            <div>
              <span className="font-medium">Expires:</span>{' '}
              {new Date(response.trace.expires * 1000).toISOString()}
            </div>
            <div>
              <span className="font-medium">Window:</span>{' '}
              {response.trace.expires - response.trace.created}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

