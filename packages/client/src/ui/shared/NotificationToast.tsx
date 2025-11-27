import { useState, useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  color?: string;
}

let toastId = 0;
const listeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, color = '#44bbff') {
  const toast = { id: ++toastId, message, color };
  listeners.forEach(fn => fn(toast));
}

export function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts(prev => [...prev.slice(-4), toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      zIndex: 20,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '6px 16px',
          background: 'rgba(10, 10, 26, 0.9)',
          border: `1px solid ${t.color}`,
          borderRadius: 6,
          color: t.color,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
