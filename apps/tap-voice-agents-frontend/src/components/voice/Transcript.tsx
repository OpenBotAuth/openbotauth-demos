interface TranscriptProps {
  messages: Array<{
    speaker: 'user' | 'agent';
    text: string;
    timestamp: number;
  }>;
}

export default function Transcript({ messages }: TranscriptProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 max-h-32 overflow-y-auto space-y-2">
      {messages.slice(-3).map((message, index) => (
        <div 
          key={index} 
          className={`text-sm ${
            message.speaker === 'user' 
              ? 'text-slate-300' 
              : 'text-blue-400'
          }`}
        >
          <span className="font-semibold">
            {message.speaker === 'user' ? 'You' : 'Agent'}:
          </span>{' '}
          {message.text}
        </div>
      ))}
    </div>
  );
}

