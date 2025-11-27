import { useRef, useCallback } from 'react';

interface MobileDrawerProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function MobileDrawer({ children, onClose }: MobileDrawerProps) {
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY > 50) {
        onClose();
      }
      touchStartY.current = null;
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 50,
        }}
      />

      {/* Drawer */}
      <div
        className="mobile-drawer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '50vh',
          overflowY: 'auto',
          background: 'rgba(10, 10, 26, 0.95)',
          borderTop: '1px solid #333366',
          borderRadius: '12px 12px 0 0',
          zIndex: 51,
          padding: '8px 12px 12px',
        }}
      >
        {/* Swipe handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: '#555577' }} />
        </div>

        {children}
      </div>
    </>
  );
}
