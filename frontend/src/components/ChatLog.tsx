import type { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
  className?: string;
}

export function ChatLog({ messages, className = '' }: ChatLogProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-4 rounded-lg ${
            msg.role === 'red_team'
              ? 'bg-red-900/30 border border-red-800 ml-0 mr-8'
              : 'bg-blue-900/30 border border-blue-800 ml-8 mr-0'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase ${
                msg.role === 'red_team' ? 'text-red-400' : 'text-blue-400'
              }`}
            >
              {msg.role === 'red_team' ? 'Attacker' : 'Defender'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Turn {msg.turn_number + 1}</span>
              {msg.blocked && (
                <span className="text-xs bg-yellow-800 text-yellow-200 px-2 py-0.5 rounded">
                  Blocked
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
          {msg.block_reason && (
            <p className="mt-2 text-xs text-yellow-400">Reason: {msg.block_reason}</p>
          )}
        </div>
      ))}
    </div>
  );
}
