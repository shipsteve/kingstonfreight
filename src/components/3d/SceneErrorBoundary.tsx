"use client";

import { Component, type ReactNode } from "react";

/** Any 3D failure (no WebGL context, shader error, lost context) shows the fallback instead of breaking the page. */
export class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[3d] scene failed, showing fallback", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
