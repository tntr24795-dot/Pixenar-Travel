"use client";

import * as React from "react";

interface WebGLErrorBoundaryProps {
  children: React.ReactNode;
  /** Rendered instead of `children` if WebGL init/rendering throws. */
  fallback: React.ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

/**
 * Wraps the 3D canvas so a graceful CSS fallback renders if WebGL context
 * creation throws (unsupported browser, blocked GPU process, driver crash,
 * etc.) instead of taking down the whole homepage.
 *
 * Note: React error boundaries only catch errors thrown during rendering,
 * not inside `useEffect`/async callbacks. `HeroScene` cooperates with this by
 * catching its own WebGL init errors and re-throwing them synchronously
 * during its next render (via a state variable), which is what this boundary
 * actually catches.
 */
export class WebGLErrorBoundary extends React.Component<WebGLErrorBoundaryProps, WebGLErrorBoundaryState> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[HeroScene] WebGL unavailable, falling back to static hero:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
