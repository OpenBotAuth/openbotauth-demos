import { AgenticConsumer } from '../../types';

interface ConsumerObjectTabProps {
  consumer: AgenticConsumer | null;
}

export default function ConsumerObjectTab({ consumer }: ConsumerObjectTabProps) {
  if (!consumer) {
    return (
      <div className="text-center py-8 text-slate-400">
        No consumer object available yet
      </div>
    );
  }

  return (
    <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
      {JSON.stringify(consumer, null, 2)}
    </pre>
  );
}

