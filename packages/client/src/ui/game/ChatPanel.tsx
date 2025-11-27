import { useState, useRef, useEffect } from 'react';
import { create } from 'zustand';

interface ChatMessage {
  id: number;
  playerName: string;
  text: string;
  timestamp: number;
  color: string;
}

interface ChatState {
  messages: ChatMessage[];
  nextId: number;
  isOpen: boolean;
  addMessage: (playerName: string, text: string, color?: string) => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const MAX_MESSAGES = 50;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  nextId: 1,
  isOpen: false,
  addMessage: (playerName, text, color = '#e0e0f0') => set((s) => ({
    messages: [...s.messages.slice(-(MAX_MESSAGES - 1)), {
      id: s.nextId,
      playerName,
      text,
      timestamp: Date.now(),
      color,
    }],
    nextId: s.nextId + 1,
  })),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
}));

interface ChatPanelProps {
  playerName: string;
  onSendChat: (message: string) => void;
}

export function ChatPanel({ playerName, onSendChat }: ChatPanelProps) {
  const { messages, isOpen, toggle, addMessage } = useChatStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isOpen]);

  const handleSend = () => {
    const text = input.trim().slice(0, 200);
    if (!text) return;
    addMessage(playerName, text, '#44bbff');
    onSendChat(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSend();
    } else if (e.key === 'Escape') {
      toggle();
    }
  };

  // Minimized: just show a toggle button and recent messages
  if (!isOpen) {
    const recent = messages.filter((m) => Date.now() - m.timestamp < 8000);
    return (
      <div style={{ width: '100%', pointerEvents: 'auto' }}>
        <button
          onClick={toggle}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            background: 'rgba(10, 10, 26, 0.85)',
            border: '1px solid #333366',
            borderRadius: 6,
            color: '#8888aa',
            cursor: 'pointer',
          }}
        >
          Chat {messages.length > 0 ? `(${messages.length})` : ''}
        </button>
        {recent.length > 0 && (
          <div style={{
            marginTop: 4,
            maxWidth: 200,
            pointerEvents: 'none',
          }}>
            {recent.slice(-3).map((msg) => (
              <div key={msg.id} style={{
                fontSize: 10,
                padding: '2px 6px',
                background: 'rgba(10, 10, 26, 0.75)',
                borderRadius: 4,
                color: msg.color,
                marginBottom: 2,
                opacity: 0.8,
              }}>
                <strong>{msg.playerName}:</strong> {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 250,
      height: typeof window !== 'undefined' && window.innerWidth <= 600 ? 'min(40vh, 300px)' : 300,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 10, 26, 0.92)',
      borderRadius: 8,
      border: '1px solid #333366',
      pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        borderBottom: '1px solid #333366',
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#e0e0f0' }}>Chat</span>
        <button
          onClick={toggle}
          style={{
            padding: '2px 6px',
            fontSize: 10,
            background: 'transparent',
            border: '1px solid #333366',
            borderRadius: 4,
            color: '#8888aa',
            cursor: 'pointer',
          }}
        >
          Minimize
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ fontSize: 11 }}>
            <span style={{ color: msg.color, fontWeight: 600 }}>{msg.playerName}: </span>
            <span style={{ color: '#e0e0f0' }}>{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Quick pings */}
      <div style={{
        display: 'flex',
        gap: 3,
        padding: '4px 8px',
        borderTop: '1px solid #333366',
        flexWrap: 'wrap',
      }}>
        {['Help!', 'Ready!', 'Focus flying!', 'Nice!'].map((ping) => (
          <button
            key={ping}
            onClick={() => { addMessage(playerName, ping, '#44bbff'); onSendChat(ping); }}
            style={{
              padding: '2px 6px', fontSize: 9, borderRadius: 3,
              background: 'rgba(68, 187, 255, 0.1)', border: '1px solid #333366',
              color: '#8888aa', cursor: 'pointer',
            }}
          >
            {ping}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '6px 8px',
        borderTop: '1px solid #222244',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={200}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: 11,
            background: 'rgba(26, 26, 58, 0.9)',
            border: '1px solid #333366',
            borderRadius: 4,
            color: '#e0e0f0',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '4px 8px',
            fontSize: 11,
            borderRadius: 4,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
