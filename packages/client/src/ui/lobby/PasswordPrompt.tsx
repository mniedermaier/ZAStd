import { useState } from 'react';

interface PasswordPromptProps {
  roomName: string;
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export function PasswordPrompt({ roomName, error, onSubmit, onCancel }: PasswordPromptProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) onSubmit(password);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#12122a',
        border: '2px solid #333366',
        borderRadius: 12,
        padding: 24,
        minWidth: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <h3 style={{ color: '#44bbff', fontSize: 16, margin: 0 }}>
          Password Required
        </h3>
        <p style={{ color: '#8888aa', fontSize: 12, margin: 0 }}>
          Room: {roomName}
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          style={{ width: '100%' }}
        />

        {error && (
          <div style={{ color: '#ff4466', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px 16px' }}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={!password}
            style={{ flex: 1, padding: '10px 16px' }}
          >
            Join
          </button>
        </div>
      </form>
    </div>
  );
}
