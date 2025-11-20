import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ManagerAnalytics] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="gba:border-red-200">
          <CardHeader>
            <CardTitle className="gba:text-red-600">
              {getTranslationFromI18nKeyAndLabel(
                'services.analytics.error.title',
                'Analytics Error'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <p className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'services.analytics.error.message',
                  'An error occurred while loading the analytics dashboard. Please try refreshing the page.'
                )}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded-md hover:gba:bg-blue-700"
                data-testid="refresh-page-button"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'services.analytics.error.refresh',
                  'Refresh Page'
                )}
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="gba:mt-4">
                  <summary className="gba:text-sm gba:text-gray-500 gba:cursor-pointer">
                    Technical Details (Development Only)
                  </summary>
                  <pre className="gba:mt-2 gba:p-2 gba:bg-gray-100 gba:text-xs gba:overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
