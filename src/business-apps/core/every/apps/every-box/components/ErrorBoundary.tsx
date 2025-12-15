/**
 * ErrorBoundary Component
 * Catches and displays errors gracefully
 */

import React, { Component, ReactNode } from 'react'
import { Alert, AlertTitle, AlertDescription, Button } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
    // Log detailed error information for debugging (not shown to user)
    console.error('[ErrorBoundary] Caught error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      errorInfo: errorInfo
    })
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  // Helper method to get translations (class components can't use hooks)
  t = (key: string, defaultValue: string): string => {
    try {
      return getTranslationFromI18nKeyAndLabel(key, defaultValue)
    } catch (error) {
      console.error('[ErrorBoundary] Translation error for key:', key, error)
      return defaultValue
    }
  }

  /**
   * Get user-friendly error message based on error type
   * Maps known error types to translated messages
   * Raw error details are logged, not shown to users
   */
  getErrorMessage = (): string => {
    const error = this.state.error

    if (!error) {
      return this.t('error-boundary-message', 'An unexpected error occurred')
    }

    // Log raw error details for debugging
    console.error('[ErrorBoundary] Error details for support:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })

    // Map known error types to user-friendly translated messages
    const errorMappings: Record<string, { key: string; defaultValue: string }> = {
      NetworkError: {
        key: 'error-boundary-network-error',
        defaultValue: 'Network connection lost. Please check your internet connection.'
      },
      TypeError: {
        key: 'error-boundary-type-error',
        defaultValue: 'A technical error occurred. Please try again.'
      },
      ReferenceError: {
        key: 'error-boundary-reference-error',
        defaultValue: 'A technical error occurred. Please try again.'
      },
      TimeoutError: {
        key: 'error-boundary-timeout-error',
        defaultValue: 'The request took too long. Please try again.'
      },
      AuthenticationError: {
        key: 'error-boundary-auth-error',
        defaultValue: 'Authentication failed. Please refresh and try again.'
      },
      PermissionError: {
        key: 'error-boundary-permission-error',
        defaultValue: 'You do not have permission to perform this action.'
      }
    }

    // Check if we have a specific mapping for this error type
    const mapping = errorMappings[error.name]
    if (mapping) {
      return this.t(mapping.key, mapping.defaultValue)
    }

    // Default generic message for unknown error types
    return this.t('error-boundary-message', 'An unexpected error occurred. Please try again.')
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="gba:p-6" data-testid="error-boundary">
          <Alert variant="destructive">
            <AlertTriangle className="gba:h-4 gba:w-4" />
            <AlertTitle>{this.t('error-boundary-title', 'Something went wrong')}</AlertTitle>
            <AlertDescription className="gba:mt-2">
              <p className="gba:mb-4">{this.getErrorMessage()}</p>
              <Button onClick={this.handleReset} variant="outline" size="sm">
                {this.t('error-boundary-try-again', 'Try Again')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
