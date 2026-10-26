import React from 'react';
/** Evita que indisponibilidade de WebGL derrube todo o portal. */
export default class SceneBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    this.props.onError?.(error);
    if (import.meta.env.DEV) console.warn('Visualização 3D indisponível neste dispositivo.', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
