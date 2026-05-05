'use client';

import { Component } from 'react';

function RegistrationFallback() {
  return (
    <div className="card-surface p-6 text-center md:p-8">
      <p className="text-lg font-semibold text-text">Something went wrong. Please reload.</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        The registration form could not load correctly. Refresh the page and try again.
      </p>
    </div>
  );
}

export class RegisterErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[registration.page] render error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <RegistrationFallback />;
    }

    try {
      return this.props.children;
    } catch (error) {
      console.error('[registration.page] boundary render error', error);
      return this.props.fallback || <RegistrationFallback />;
    }
  }
}

export { RegistrationFallback };
