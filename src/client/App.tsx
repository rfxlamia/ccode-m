import type { ReactNode } from 'react';

export default function App(): ReactNode {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Claude Code Modern</h1>
        <p className="text-muted-foreground">GUI is loading...</p>
      </main>
    </div>
  );
}
