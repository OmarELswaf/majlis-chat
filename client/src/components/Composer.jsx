import { useRef, useState } from 'react';

export default function Composer({ onSend, onTyping, roomName }) {
  const [text, setText] = useState('');
  const lastTyping = useRef(0);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed.slice(0, 500));
    setText('');
  };

  const change = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTyping.current > 1500) {
      lastTyping.current = now;
      onTyping();
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-line bg-panel/60 px-4 sm:px-6 py-3.5 flex gap-3">
      <input
        value={text}
        onChange={change}
        placeholder={`Message # ${roomName}`}
        maxLength={500}
        className="flex-1 bg-ink border border-line rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="bg-accent text-ink font-semibold text-sm rounded-xl px-5 py-2.5 disabled:opacity-40 hover:bg-accent/90 transition-colors"
      >
        Send
      </button>
    </form>
  );
}
