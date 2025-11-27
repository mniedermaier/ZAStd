import { useState, useEffect } from 'react';

const STORAGE_KEY = 'zastd:orientation-hint-seen';

export function OrientationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const seen = sessionStorage.getItem(STORAGE_KEY);
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isTouchDevice && !seen && isPortrait) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem(STORAGE_KEY, '1');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        top: 'max(12px, env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        background: 'rgba(68, 187, 255, 0.15)',
        border: '1px solid #44bbff',
        borderRadius: 8,
        fontSize: 12,
        color: '#44bbff',
        zIndex: 250,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: 'fadeIn 0.3s ease-out',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 16 }}>&#x1F4F1;</span>
      Rotate for best experience
      <span style={{ fontSize: 10, color: '#8888aa' }}>tap to dismiss</span>
    </div>
  );
}
