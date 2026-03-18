// =============================================================================
// main.tsx — React entry point
// =============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';

// Ensure the <html> element always carries the "dark" class so Tailwind's
// darkMode: 'class' strategy activates throughout the app.
document.documentElement.classList.add('dark');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    '[werewolf-ui] Could not find #root element. Check index.html.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
