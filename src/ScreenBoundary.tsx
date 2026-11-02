import { Component, Suspense, type PropsWithChildren } from 'react';
export class ScreenBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p className="screen-state screen-error" role="alert">This screen could not load. <a href={window.location.pathname}>Reload to retry</a>.</p> : <Suspense fallback={<p className="screen-state" role="status">Loading screen…</p>}>{this.props.children}</Suspense>;
  }
}
