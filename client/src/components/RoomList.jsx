export default function RoomList({ rooms, activeRoom, onSelect, horizontal }) {
  if (horizontal) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              r.id === activeRoom
                ? 'border-accent/50 bg-accent/15 text-accent'
                : 'border-line text-slate-400 hover:text-slate-200'
            }`}
          >
            # {r.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Rooms</p>
      {rooms.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${
            r.id === activeRoom
              ? 'border-accent/50 bg-accent/10'
              : 'border-transparent hover:border-line hover:bg-panel'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-medium ${r.id === activeRoom ? 'text-accent' : 'text-slate-200'}`}># {r.name}</span>
            <span className="text-xs text-slate-500">{r.messageCount ?? 0}</span>
          </div>
          {r.lastMessage && (
            <p className="text-xs text-slate-500 truncate mt-1">
              <span className="text-slate-400">{r.lastMessage.user}:</span> {r.lastMessage.text}
            </p>
          )}
        </button>
      ))}
    </nav>
  );
}
