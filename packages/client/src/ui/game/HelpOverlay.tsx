interface HelpOverlayProps {
  onClose: () => void;
}

const isMobileDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  const mobile = isMobileDevice();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 210,
      overflow: 'auto',
    }}>
      <div style={{
        background: '#12122a',
        border: '2px solid #333366',
        borderRadius: 12,
        padding: 24,
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'auto',
        width: '90%',
      }}>
        <h2 style={{ textAlign: 'center', fontSize: 20, color: '#44bbff', marginBottom: 16 }}>
          How to Play
        </h2>

        {mobile ? (
          <Section title="Controls">
            <Row k="Drag" v="Pan the camera" />
            <Row k="Pinch" v="Zoom in/out" />
            <Row k="Tap tower" v="Select tower to build" />
            <Row k="Tap map" v="Place tower / select tower" />
            <Row k="X button" v="Cancel placement" />
            <Row k="|| button" v="Pause / Menu" />
            <Row k="Toolbar" v="Open tech, scout, map, log panels" />
            <Row k="Swipe down" v="Close panels" />
          </Section>
        ) : (
          <Section title="Controls">
            <Row k="1-9" v="Select tower type" />
            <Row k="Space" v="Start next wave" />
            <Row k="Q" v="Upgrade selected tower" />
            <Row k="E" v="Sell selected tower" />
            <Row k="Escape" v="Cancel / Pause" />
            <Row k="H" v="Toggle this help" />
            <Row k="Right-drag" v="Pan camera" />
            <Row k="Scroll wheel" v="Zoom in/out" />
            <Row k="WASD" v="Pan camera" />
            <Row k="Pinch" v="Zoom (mobile)" />
          </Section>
        )}

        <Section title="Game Basics">
          <P>Build towers to create a maze. Enemies follow the path from the green spawn to the red exit. If enemies reach the exit, you lose shared lives. Survive all 40 waves to win!</P>
        </Section>

        <Section title="Economy">
          <Row k="Gold" v="Earned from killing enemies. Used to build and upgrade towers." />
          <Row k="Lumber" v="Awarded every 5 waves. Used to buy tech upgrades." />
          <Row k="Interest" v="Earn bonus gold each wave based on your current gold." />
        </Section>

        <Section title="Governors">
          <P>Choose a governor to unlock 4 specialized towers (3 regular + 1 ultimate). Each governor has a passive bonus:</P>
          <GovRow emoji="F" name="Fire" bonus="+5% damage" color="#FF4400" />
          <GovRow emoji="I" name="Ice" bonus="+10% slow duration" color="#44BBFF" />
          <GovRow emoji="T" name="Thunder" bonus="+1 chain target" color="#FFEE00" />
          <GovRow emoji="P" name="Poison" bonus="+10% poison damage" color="#88FF00" />
          <GovRow emoji="D" name="Death" bonus="+2% execute threshold" color="#AA44CC" />
          <GovRow emoji="N" name="Nature" bonus="+10% stun duration" color="#22CC44" />
          <GovRow emoji="A" name="Arcane" bonus="+5% magic damage" color="#CC44FF" />
          <GovRow emoji="H" name="Holy" bonus="+5% aura range" color="#FFDD88" />
        </Section>

        <Section title="Enemy Types">
          <EnemyRow name="Basic" desc="Standard enemy. No special abilities." color="#ff4466" />
          <EnemyRow name="Fast" desc="High speed, low health. Rushes through your maze." color="#ffaa44" />
          <EnemyRow name="Tank" desc="Very high health, very slow. 2 lives damage on leak." color="#88ff44" />
          <EnemyRow name="Swarm" desc="Tiny, fast, cheap. Comes in huge numbers." color="#ff8888" />
          <EnemyRow name="Armored" desc="50% physical damage reduction. Use magic towers!" color="#aaaacc" />
          <EnemyRow name="Magic Resist" desc="50% magic damage reduction. Use physical towers!" color="#cc88ff" />
          <EnemyRow name="Flying" desc="Ignores maze walls. Follows waypoints directly." color="#88ddff" />
          <EnemyRow name="Healer" desc="Regenerates 5 HP/s. Poison halves healing!" color="#44ff88" />
          <EnemyRow name="Berserker" desc="Gets faster with each hit. Kill quickly!" color="#ff6644" />
          <EnemyRow name="Splitter" desc="Splits into 2 basic enemies on death." color="#ffdd44" />
          <EnemyRow name="Boss" desc="Massive HP, armor + magic resist. Every 10th wave." color="#ff2244" />
        </Section>

        <Section title="Damage Types">
          <Row k="Physical" v="Reduced by armor. Common towers deal physical damage." />
          <Row k="Magic" v="Reduced by magic resist. Governor towers deal magic damage." />
        </Section>

        <Section title="Tech Upgrades">
          <Row k="Forge Weapons" v="+10% tower damage per level (max 3)" />
          <Row k="Eagle Eye" v="+10% tower range per level (max 3)" />
          <Row k="Banking" v="+1% interest rate per level (max 3)" />
          <Row k="Efficient Building" v="-10% tower build cost per level (max 2)" />
          <Row k="Ultimate Power" v="Unlock your governor's ultimate tower (3 lumber)" />
        </Section>

        <button
          className="primary"
          onClick={onClose}
          style={{ width: '100%', marginTop: 16, padding: '10px 20px' }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, color: '#44ff88', marginBottom: 8, borderBottom: '1px solid #333366', paddingBottom: 4 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ minWidth: 100, color: '#ffdd44', fontFamily: 'monospace', fontWeight: 600 }}>{k}</span>
      <span style={{ color: '#e0e0f0' }}>{v}</span>
    </div>
  );
}

function GovRow({ emoji, name, bonus, color }: { emoji: string; name: string; bonus: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3, fontSize: 12 }}>
      <span style={{ minWidth: 20, textAlign: 'center' }}>{emoji}</span>
      <span style={{ minWidth: 70, color, fontWeight: 600 }}>{name}</span>
      <span style={{ color: '#8888aa' }}>{bonus}</span>
    </div>
  );
}

function EnemyRow({ name, desc, color }: { name: string; desc: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3, fontSize: 12 }}>
      <span style={{ minWidth: 8, height: 8, borderRadius: '50%', background: color, marginTop: 3, flexShrink: 0 }} />
      <span style={{ minWidth: 80, color, fontWeight: 600 }}>{name}</span>
      <span style={{ color: '#c0c0d0' }}>{desc}</span>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: '#c0c0d0', marginBottom: 8, lineHeight: 1.5 }}>{children}</p>;
}
