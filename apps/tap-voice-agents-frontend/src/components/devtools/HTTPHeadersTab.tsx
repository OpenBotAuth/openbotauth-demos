interface HTTPHeadersTabProps {
  headers: Record<string, string> | null;
}

export default function HTTPHeadersTab({ headers }: HTTPHeadersTabProps) {
  if (!headers) {
    return (
      <div className="text-center py-8 text-slate-400">
        No HTTP headers available yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(headers).map(([key, value]) => (
        <div key={key} className="font-mono text-sm">
          <span className="text-emerald-400">{key}:</span>{' '}
          <span className="text-slate-300">{value}</span>
        </div>
      ))}
    </div>
  );
}

