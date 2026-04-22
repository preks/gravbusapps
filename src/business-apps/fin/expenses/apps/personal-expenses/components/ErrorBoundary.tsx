import { Component, ErrorInfo, ReactNode } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="gba:p-5 gba:border gba:border-destructive gba:rounded gba:bg-destructive/10">
            <h3>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.something_went_wrong',
                'Something went wrong'
              )}
            </h3>
            <details>
              <summary>
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.error_details', 'Error details')}
              </summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
            <button onClick={() => this.setState({ hasError: false })}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again')}
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
