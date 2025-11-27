import { useState, useEffect } from 'react';

const STORAGE_KEY = 'zastd:tutorial-seen';

const STEPS = [
  { icon: '\u{1F50D}', title: 'Pinch to Zoom', desc: 'Use two fingers to zoom in and out of the map' },
  { icon: '\u{1F446}', title: 'Drag to Pan', desc: 'Swipe with one finger to move around the map' },
  { icon: '\u{1F3F0}', title: 'Tap to Place', desc: 'Select a tower below, then tap a cell to build' },
];

export function MobileTutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (isTouchDevice && !seen) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
    }}>
      <div style={{
        width: 'min(300px, 85vw)',
        padding: 24,
        background: '#12122a',
        borderRadius: 12,
        border: '1px solid #44bbff',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{current.icon}</div>
        <h3 style={{ fontSize: 18, color: '#44bbff', marginBottom: 8 }}>{current.title}</h3>
        <p style={{ fontSize: 13, color: '#8888aa', marginBottom: 20, lineHeight: 1.5 }}>{current.desc}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === step ? '#44bbff' : '#333366',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSkip} style={{ flex: 1, padding: '10px', fontSize: 13, color: '#8888aa' }}>
            Skip
          </button>
          <button className="primary" onClick={handleNext} style={{ flex: 1, padding: '10px', fontSize: 13 }}>
            {step < STEPS.length - 1 ? 'Next' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
}
