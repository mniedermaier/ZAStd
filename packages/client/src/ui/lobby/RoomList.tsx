import type { RoomAdvertisement } from '../../networking/protocol';

interface RoomListProps {
  rooms: RoomAdvertisement[];
  onJoinRoom: (room: RoomAdvertisement) => void;
  onBack: () => void;
}

export function RoomList({ rooms, onJoinRoom, onBack }: RoomListProps) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 24,
      gap: 16,
    }}>
      <h2 style={{ fontSize: 24, color: '#44bbff', letterSpacing: 2 }}>Browse Rooms</h2>

      <div style={{
        width: '100%',
        maxWidth: 600,
        flex: 1,
        overflow: 'auto',
        background: 'rgba(26, 26, 58, 0.3)',
        borderRadius: 8,
        border: '1px solid #333366',
      }}>
        {rooms.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#555577',
            fontSize: 14,
          }}>
            No rooms found. Create one or try again later.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#8888aa', borderBottom: '1px solid #333366' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Room</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Host</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>Players</th>
                <th style={{ textAlign: 'center', padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...rooms].sort((a, b) => Number(a.inGame) - Number(b.inGame)).map((room) => (
                <tr
                  key={room.roomCode}
                  onClick={room.inGame ? undefined : () => onJoinRoom(room)}
                  style={{
                    cursor: room.inGame ? 'default' : 'pointer',
                    borderBottom: '1px solid #1a1a3a',
                    opacity: room.inGame ? 0.5 : 1,
                  }}
                  onMouseOver={room.inGame ? undefined : (e) => (e.currentTarget.style.background = 'rgba(68, 187, 255, 0.06)')}
                  onMouseOut={room.inGame ? undefined : (e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: room.inGame ? '#666688' : '#44bbff' }}>
                    {room.roomCode}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{room.roomName}</td>
                  <td style={{ padding: '8px 12px', color: '#aaaacc' }}>{room.hostName}</td>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    {room.playerCount}/{room.maxPlayers}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11 }}>
                    {room.hasPassword && <span title="Password protected">🔒 </span>}
                    {room.inGame
                      ? <span style={{ color: '#ff8844' }}>In Game</span>
                      : <span style={{ color: '#44ff88' }}>Lobby</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button onClick={onBack} style={{ padding: '10px 24px' }}>
        Back
      </button>
    </div>
  );
}
