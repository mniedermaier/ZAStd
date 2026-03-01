import { useState } from 'react';

interface CreateRoomFormProps {
  onCancel: () => void;
  onCreate: (config: { roomName: string; password?: string; mapSize: string; difficulty: string; mapLayout?: string }) => void;
}

export function CreateRoomForm({ onCancel, onCreate }: CreateRoomFormProps) {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [mapSize, setMapSize] = useState('medium');
  const [mapLayout, setMapLayout] = useState('classic');
  const [difficulty, setDifficulty] = useState('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    onCreate({
      roomName: roomName.trim(),
      password: password || undefined,
      mapSize,
      difficulty,
      mapLayout,
    });
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
      <h2 style={{ fontSize: 24, color: '#44bbff', letterSpacing: 2 }}>Create Room</h2>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: 'min(300px, 90vw)',
        padding: 20,
        background: 'rgba(26, 26, 58, 0.5)',
        borderRadius: 8,
        border: '1px solid #333366',
      }}>
        <div>
          <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
            Room Name *
          </label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="My Room"
            maxLength={30}
            autoFocus
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
            Password (optional)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave empty for open room"
            maxLength={30}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
              Map Size
            </label>
            <select value={mapSize} onChange={(e) => setMapSize(e.target.value)} style={{ width: '100%' }}>
              <option value="tiny">Tiny</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
              Layout
            </label>
            <select value={mapLayout} onChange={(e) => setMapLayout(e.target.value)} style={{ width: '100%' }}>
              <option value="classic">Classic</option>
              <option value="spiral">Spiral</option>
              <option value="crossroads">Crossroads</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>
            Difficulty
          </label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: '100%' }}>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="extreme">Extreme</option>
            <option value="endless">Endless</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px 16px' }}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={!roomName.trim()}
            style={{ flex: 1, padding: '10px 16px' }}
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
