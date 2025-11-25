import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="gba:p-4 gba:bg-destructive-secondary gba:text-destructive gba:rounded-md">
            <p className="gba:font-semibold">Something went wrong</p>
            <p className="gba:text-sm gba:mt-1">{this.state.error?.message || 'An error occurred'}</p>
          </div>
        )
      )
    }

    return this.props.children
  }
}
