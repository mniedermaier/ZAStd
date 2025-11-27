import { useState } from 'react';

interface JoinByCodeProps {
  error: string | null;
  onJoin: (code: string) => void;
  onCancel: () => void;
}

export function JoinByCode({ error, onJoin, onCancel }: JoinByCodeProps) {
  const [code, setCode] = useState('');

  const handleInput = (val: string) => {
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) onJoin(code);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      <h2 style={{ fontSize: 24, color: '#44bbff', letterSpacing: 2 }}>Join by Code</h2>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        alignItems: 'center',
        padding: 20,
        background: 'rgba(26, 26, 58, 0.5)',
        borderRadius: 8,
        border: '1px solid #333366',
        width: 'min(280px, 90vw)',
      }}>
        <input
          value={code}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="ABCD"
          maxLength={4}
          autoFocus
          style={{
            width: 140,
            fontSize: 28,
            textAlign: 'center',
            letterSpacing: 8,
            fontFamily: 'monospace',
          }}
        />

        {error && (
          <div style={{ color: '#ff4466', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px 16px' }}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={code.length !== 4}
            style={{ flex: 1, padding: '10px 16px' }}
          >
            Join
          </button>
        </div>
      </form>
    </div>
  );
}
