import { create } from 'zustand';
import { useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  expiresAt: number;
}

interface ToastState {
  toasts: Toast[];
  nextId: number;
  addToast: (message: string, type?: Toast['type'], durationMs?: number) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  nextId: 1,
  addToast: (message, type = 'info', durationMs = 3000) => set((s) => ({
    toasts: [...s.toasts.slice(-4), { id: s.nextId, message, type, expiresAt: Date.now() + durationMs }],
    nextId: s.nextId + 1,
  })),
  removeToast: (id) => set((s) => ({
    toasts: s.toasts.filter((t) => t.id !== id),
  })),
}));

const TYPE_COLORS = {
  info: '#44bbff',
  success: '#44ff88',
  error: '#ff4466',
  warning: '#ffaa44',
};

export function ActionToast() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  // Auto-remove expired toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      for (const t of toasts) {
        if (now >= t.expiresAt) removeToast(t.id);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      zIndex: 100,
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          padding: '8px 16px',
          background: 'rgba(10, 10, 26, 0.92)',
          border: `1px solid ${TYPE_COLORS[toast.type]}`,
          borderRadius: 8,
          color: TYPE_COLORS[toast.type],
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          animation: 'fadeInDown 0.2s ease-out',
        }}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
