import { useEffect, useRef, useState } from 'react';
import { createTransport } from './api';
import RoomList from './components/RoomList';
import MessageList from './components/MessageList';
import Composer from './components/Composer';

export default function App() {
  const [transport, setTransport] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [typing, setTyping] = useState(null);
  const [user, setUser] = useState(() => localStorage.getItem('majlis-user') || '');
  const [joined, setJoined] = useState(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    let t;
    createTransport().then((tr) => {
      t = tr;
      setTransport(tr);
      tr.fetchRooms().then(setRooms);
    });
    return () => t && t.disconnect();
  }, []);

  useEffect(() => {
    if (!transport || !joined || !user) return undefined;
    setMessages([]);
    setPresence([]);
    setTyping(null);
    transport.fetchMessages(activeRoom).then(setMessages);
    transport.join(activeRoom, user);

    const offMsg = transport.onMessage((m) => {
      if (m.roomId === activeRoom) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        setTyping((cur) => (cur && cur.user === m.user ? null : cur));
      }
      setRooms((prev) =>
        prev.map((r) =>
          r.id === m.roomId ? { ...r, messageCount: (r.messageCount || 0) + 1, lastMessage: m } : r
        )
      );
    });
    const offPres = transport.onPresence((p) => {
      if (p.roomId === activeRoom) setPresence(p.users);
    });
    const offTyp = transport.onTyping((t) => {
      if (t.roomId === activeRoom) {
        setTyping(t);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 2500);
      }
    });
    return () => {
      offMsg();
      offPres();
      offTyp();
    };
  }, [transport, activeRoom, joined, user]);

  const join = (name) => {
    localStorage.setItem('majlis-user', name);
    setUser(name);
    setJoined(true);
  };

  const send = (text) => {
    if (!transport) return;
    transport.send(activeRoom, user, text);
  };

  const sendTyping = () => {
    if (transport && transport.mode === 'live') transport.sendTyping(activeRoom, user);
  };

  if (!joined) {
    return <JoinScreen onJoin={join} initial={user} />;
  }

  const room = rooms.find((r) => r.id === activeRoom);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel/70 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent grid place-items-center font-bold text-lg">M</div>
          <div>
            <h1 className="font-semibold text-slate-100 leading-tight">Majlis</h1>
            <p className="text-xs text-slate-400">Realtime chat rooms</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {transport && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full border ${
                transport.mode === 'live'
                  ? 'border-accent/40 text-accent bg-accent/10'
                  : 'border-amber-400/40 text-amber-300 bg-amber-400/10'
              }`}
              title={
                transport.mode === 'demo'
                  ? 'Simulated demo: WebSockets do not run on this static host. Run locally for the full Socket.io backend.'
                  : 'Connected to the live Socket.io backend'
              }
            >
              {transport.mode === 'live' ? 'live socket' : 'simulated demo'}
            </span>
          )}
          <a
            href="https://github.com/OmarELswaf/majlis-chat"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-accent border border-line rounded-lg px-3 py-1.5 transition-colors"
          >
            Source on GitHub
          </a>
        </div>
      </header>

      {transport && transport.mode === 'demo' && (
        <div className="bg-amber-400/10 border-b border-amber-400/20 text-amber-200/90 text-xs sm:text-sm px-4 sm:px-6 py-2">
          Demo mode: messages are simulated in your browser (the bots are not real people). WebSockets need a long-lived
          server, so the full Socket.io + MongoDB backend runs locally - see the README.
        </div>
      )}

      <div className="flex-1 flex min-h-0 max-w-6xl w-full mx-auto">
        <aside className="hidden sm:block w-72 shrink-0 border-r border-line p-4">
          <RoomList rooms={rooms} activeRoom={activeRoom} onSelect={setActiveRoom} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="px-4 sm:px-6 py-3 border-b border-line flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-100"># {room ? room.name : activeRoom}</h2>
              {room && <p className="text-xs text-slate-500">{room.topic}</p>}
            </div>
            {presence.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                <span className="text-xs text-slate-400">{presence.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="sm:hidden px-4 pt-3">
            <RoomList rooms={rooms} activeRoom={activeRoom} onSelect={setActiveRoom} horizontal />
          </div>

          <MessageList messages={messages} user={user} typing={typing} />
          <Composer onSend={send} onTyping={sendTyping} roomName={room ? room.name : activeRoom} />
        </main>
      </div>
    </div>
  );
}

function JoinScreen({ onJoin, initial }) {
  const [name, setName] = useState(initial);
  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onJoin(trimmed.slice(0, 30));
  };
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-panel border border-line rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-accent/20 text-accent grid place-items-center font-bold text-xl mb-4">M</div>
        <h1 className="text-2xl font-semibold text-slate-100">Majlis</h1>
        <p className="text-sm text-slate-400 mt-1 mb-6">Realtime chat rooms with live presence and typing indicators.</p>
        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Pick a display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Omar"
          maxLength={30}
          className="w-full bg-ink border border-line rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none focus:border-accent transition-colors"
          autoFocus
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full bg-accent text-ink font-semibold rounded-xl py-2.5 disabled:opacity-40 hover:bg-accent/90 transition-colors"
        >
          Join the rooms
        </button>
      </form>
    </div>
  );
}
