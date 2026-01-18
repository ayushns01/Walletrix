'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {

    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {

    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-red-500/20 p-3 rounded-full mr-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-400 mt-1">
                  We encountered an unexpected error
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-3">
                  Error Details (Development Only):
                </h2>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-gray-400 text-xs overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                If this problem persists, please contact support or check the console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AsyncErrorBoundary({ children, fallback }) {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={fallback || <LoadingFallback />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export function FeatureErrorBoundary({ children, feature = 'feature' }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 my-4">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-red-500 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-red-500 font-semibold mb-1">
                Error loading {feature}
              </h3>
              <p className="text-gray-400 text-sm">
                This feature encountered an error. Please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
