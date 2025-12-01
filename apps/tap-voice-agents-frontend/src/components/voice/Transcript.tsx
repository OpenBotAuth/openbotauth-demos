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
    <div className="mt-4 max-h-32 overflow-y-auto space-y-3">
      {messages.slice(-3).map((message, index) => (
        <div 
          key={index} 
          className={`text-sm p-2 rounded ${
            message.speaker === 'user' 
              ? 'bg-blue-50 text-gray-800 border border-blue-200' 
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}
        >
          <span className="font-semibold text-gray-900">
            {message.speaker === 'user' ? 'You' : 'Agent'}:
          </span>{' '}
          {message.text}
        </div>
      ))}
    </div>
  );
}

