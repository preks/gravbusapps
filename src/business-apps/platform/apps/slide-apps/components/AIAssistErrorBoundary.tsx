// AI Assist Error Boundary - Prevents crashes from affecting presentation.

import React from 'react'

export interface AIAssistErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error) => void
  fallback?: React.ReactNode
}

interface AIAssistErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AIAssistErrorBoundary extends React.Component<AIAssistErrorBoundaryProps, AIAssistErrorBoundaryState> {
  constructor(props: AIAssistErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): AIAssistErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[AIAssist] Error caught:', error, errorInfo)
    this.props.onError?.(error)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Silently disable feature rather than show error
      // This prevents AI assist issues from crashing the presentation
      if (this.props.fallback) {
        return this.props.fallback
      }
      return null
    }
    return this.props.children
  }
}

export default AIAssistErrorBoundary
