/**
 * FortuneSheetErrorBoundary
 *
 * Error boundary that catches FortuneSheet initialization errors
 * (specifically the luckysheet_select_save error) and prevents them
 * from crashing the entire component tree.
 */

import React, { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  retryCount: number
}

const MAX_RETRIES = 3
const RETRY_DELAY = 100

export class FortuneSheetErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
    console.log('[FortuneSheetErrorBoundary] CONSTRUCTOR')
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.log('[FortuneSheetErrorBoundary] getDerivedStateFromError called', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    })

    // Check if this is the known FortuneSheet initialization error
    const isFortuneSheetInitError =
      error.message?.includes('luckysheet_select_save') ||
      error.message?.includes('getSelection') ||
      error.message?.includes("Cannot read properties of undefined (reading 'luckysheet_select_save')")

    if (isFortuneSheetInitError) {
      console.log('[FortuneSheetErrorBoundary] Caught FortuneSheet init error, suppressing')
      // Suppress the error and mark for retry
      return { hasError: true, error }
    }

    console.log('[FortuneSheetErrorBoundary] Non-FortuneSheet error, re-throwing')
    // For other errors, let them propagate
    throw error
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.log('[FortuneSheetErrorBoundary] componentDidCatch called', {
      errorMessage: error.message,
      retryCount: this.state.retryCount,
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 5).join('\n')
    })

    const isFortuneSheetInitError =
      error.message?.includes('luckysheet_select_save') ||
      error.message?.includes("Cannot read properties of undefined (reading 'luckysheet_select_save')")

    if (isFortuneSheetInitError) {
      console.log('[FortuneSheetErrorBoundary] Scheduling retry', {
        currentRetryCount: this.state.retryCount,
        maxRetries: MAX_RETRIES
      })
      // Suppress console error for known initialization issue
      // Schedule a retry after a short delay
      if (this.state.retryCount < MAX_RETRIES) {
        this.retryTimeoutId = setTimeout(
          () => {
            console.log('[FortuneSheetErrorBoundary] Retry timeout fired, resetting state')
            this.setState(prevState => ({
              hasError: false,
              error: null,
              retryCount: prevState.retryCount + 1
            }))
          },
          RETRY_DELAY * (this.state.retryCount + 1)
        )
      }
    } else {
      // For non-FortuneSheet errors, call the error handler
      this.props.onError?.(error, errorInfo)
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If we've exhausted retries, show a minimal fallback
      if (this.state.retryCount >= MAX_RETRIES) {
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
            <span>Loading spreadsheet...</span>
          </div>
        )
      }
      // During retry delay, show loading state
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
          <span>Initializing...</span>
        </div>
      )
    }

    return this.props.children
  }
}

export default FortuneSheetErrorBoundary
