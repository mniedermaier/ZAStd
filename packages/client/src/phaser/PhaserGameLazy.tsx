import React, { Suspense } from 'react';

const PhaserGameInner = React.lazy(() =>
  import('./PhaserGame').then((mod) => ({ default: mod.PhaserGame }))
);

function LoadingFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a1a',
      color: '#44bbff',
      fontSize: 16,
      fontFamily: 'monospace',
    }}>
      Loading game engine...
    </div>
  );
}

export function PhaserGameLazy(props: React.ComponentProps<typeof PhaserGameInner>) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PhaserGameInner {...props} />
    </Suspense>
  );
}
