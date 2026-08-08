"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Generic error boundary for the WebGL hero. If Three.js throws for any
 * reason (no WebGL support, context creation failure, a texture load that
 * throws synchronously, etc.) we render `fallback` -- the plain real-photo
 * crossfade hero (`PhotoHero`) -- instead of taking down the whole page.
 */
export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[WebGLErrorBoundary] 3D hero failed, falling back to static photo hero:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
