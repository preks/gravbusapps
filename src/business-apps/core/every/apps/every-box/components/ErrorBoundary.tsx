/**
 * ErrorBoundary Component
 * Catches and displays errors gracefully
 */

import React, { Component, ReactNode } from 'react'
import { Alert, AlertTitle, AlertDescription, Button } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging purposes
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="gba:p-6" data-testid="error-boundary">
          <Alert variant="destructive">
            <AlertTriangle className="gba:h-4 gba:w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="gba:mt-2">
              <p className="gba:mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
              <Button onClick={this.handleReset} variant="outline" size="sm">
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
