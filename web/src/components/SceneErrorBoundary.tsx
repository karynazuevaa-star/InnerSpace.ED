import { Component, type ReactNode } from 'react';

interface Props {
  onError: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Must be rendered INSIDE a <Canvas>, wrapping the Suspense boundary(ies)
 * that load required glTFs. React error boundaries only catch a throw from
 * components in their own render tree - a boundary living in the normal DOM
 * tree outside <Canvas> can't see into it, since Canvas mounts a separate
 * react-three-fiber root. A failed useGLTF load throws the rejected
 * promise's error past Suspense (which only intercepts pending promises),
 * so this is what actually catches it.
 *
 * Renders null on error (valid inside the WebGL tree) rather than any HTML,
 * and calls onError so the page component outside the canvas can swap in a
 * neutral screen over the broken scene.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
