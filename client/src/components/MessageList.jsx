import { useEffect, useRef } from 'react';

function timeLabel(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MessageList({ messages, user, typing }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
      {messages.map((m) => {
        const own = m.user === user;
        return (
          <div key={m.id} className={`msg-in flex ${own ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 border ${
                own
                  ? 'bg-accent/15 border-accent/30 rounded-br-md'
                  : 'bg-panel border-line rounded-bl-md'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-xs font-semibold ${own ? 'text-accent' : 'text-emerald-300/80'}`}>{m.user}</span>
                <span className="text-[10px] text-slate-500">{timeLabel(m.at)}</span>
              </div>
              <p className="text-sm text-slate-200 mt-0.5 break-words">{m.text}</p>
            </div>
          </div>
        );
      })}

      {typing && (
        <div className="flex justify-start">
          <div className="bg-panel border border-line rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-400">{typing.user} is typing</span>
            <span className="flex gap-1">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
