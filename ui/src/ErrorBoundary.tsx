// =============================================================================
// ErrorBoundary.tsx — Catches React render errors and shows a diagnostic panel
// =============================================================================

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] caught:', error, info);
    this.setState({ errorInfo: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#1a1a1a',
          color: '#ff6b6b',
          fontFamily: 'monospace',
          padding: '2rem',
          minHeight: '100vh',
        }}>
          <h1 style={{ color: '#ff4444', fontSize: '1.5rem', marginBottom: '1rem' }}>
            🐺 UI Error — React render crashed
          </h1>
          <p style={{ color: '#ffaa44', marginBottom: '1rem' }}>
            {this.state.error?.message}
          </p>
          <pre style={{
            background: '#111',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            overflow: 'auto',
            color: '#aaa',
            whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.stack}
          </pre>
          <pre style={{
            background: '#111',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            overflow: 'auto',
            color: '#888',
            marginTop: '1rem',
            whiteSpace: 'pre-wrap',
          }}>
            Component stack:{this.state.errorInfo}
          </pre>
          <button
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: '' })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
