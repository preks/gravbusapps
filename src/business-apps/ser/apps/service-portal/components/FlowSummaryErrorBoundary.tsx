import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, Alert, Button } from '@newwork/nw-design-system'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class FlowSummaryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FlowSummaryErrorBoundary] Caught error:', error)
    console.error('[FlowSummaryErrorBoundary] Error info:', errorInfo)
    console.error('[FlowSummaryErrorBoundary] Component stack:', errorInfo.componentStack)

    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="gba:p-6" data-testid="flow-summary-error-boundary">
          <Alert variant="destructive">
            <h4 className="gba:font-semibold gba:mb-2">Failed to Display Flow Summary</h4>
            <p className="gba:text-sm gba:mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            {this.state.errorInfo && (
              <details className="gba:text-xs gba:mt-2">
                <summary className="gba:cursor-pointer gba:font-medium">Error Details</summary>
                <pre className="gba:mt-2 gba:p-2 gba:bg-muted gba:rounded gba:overflow-auto gba:max-h-40">
                  {this.state.error?.stack}
                </pre>
                <pre className="gba:mt-2 gba:p-2 gba:bg-muted gba:rounded gba:overflow-auto gba:max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="gba:mt-4"
            >
              Dismiss
            </Button>
          </Alert>
        </Card>
      )
    }

    return this.props.children
  }
}
