interface RawRequestTabProps {
  method?: string;
  url?: string;
  headers?: Record<string, string> | null;
  body?: any;
}

export default function RawRequestTab({ method, url, headers, body }: RawRequestTabProps) {
  if (!method || !url) {
    return (
      <div className="text-center py-8 text-slate-400">
        No request data available yet
      </div>
    );
  }

  const curlCommand = `curl -X ${method} '${url}' \\
${headers ? Object.entries(headers)
    .map(([key, value]) => `  -H '${key}: ${value}'`)
    .join(' \\\n') : ''}${body ? ` \\\n  -d '${JSON.stringify(body)}'` : ''}`;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-2">cURL Command:</h4>
        <pre className="font-mono text-xs text-slate-300 bg-slate-800 p-4 rounded overflow-x-auto">
          {curlCommand}
        </pre>
      </div>
      <div>
        <button 
          onClick={() => navigator.clipboard.writeText(curlCommand)}
          className="btn-secondary text-xs"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}

