import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 10, 26, 0.98)',
          zIndex: 9999,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 420,
            padding: 32,
            background: 'rgba(26, 26, 58, 0.95)',
            borderRadius: 12,
            border: '1px solid #ff4466',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4466', marginBottom: 12 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 13, color: '#8888aa', marginBottom: 16, lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={this.handleReload} style={{ padding: '8px 20px' }}>
                Reload Game
              </button>
              <button onClick={this.handleDismiss} className="danger" style={{ padding: '8px 20px' }}>
                Try to Continue
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
