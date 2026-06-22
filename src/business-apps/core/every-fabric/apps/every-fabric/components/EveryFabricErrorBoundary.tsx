import { useTranslation } from '@newwork/nw-design-system'
import React, { Component, type ReactNode } from 'react'

import translations from '../_i18n'

interface EveryFabricErrorFallbackProps {
  error: Error | null
  onReload: () => void
}

function EveryFabricErrorFallback({ error, onReload }: EveryFabricErrorFallbackProps) {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:flex gba:h-full gba:min-h-full gba:items-center gba:justify-center gba:bg-background gba:p-6">
      <div className="gba:w-full gba:max-w-xl gba:rounded-3xl gba:border gba:border-destructive/20 gba:bg-background gba:p-6 gba:shadow-sm">
        <p className="gba:text-sm gba:font-semibold gba:text-destructive">{t('error-boundary-title')}</p>
        <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">
          {error?.message || t('error-boundary-unknown')}
        </p>
        <button
          onClick={onReload}
          className="gba:mt-4 gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
        >
          {t('error-boundary-retry')}
        </button>
      </div>
    </div>
  )
}

interface EveryFabricErrorBoundaryProps {
  children: ReactNode
}

interface EveryFabricErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class EveryFabricErrorBoundary extends Component<EveryFabricErrorBoundaryProps, EveryFabricErrorBoundaryState> {
  constructor(props: EveryFabricErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): EveryFabricErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[EveryFabricErrorBoundary] Caught render error:', error)
    console.error('[EveryFabricErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  private readonly handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return <EveryFabricErrorFallback error={this.state.error} onReload={this.handleReload} />
    }

    return this.props.children
  }
}
