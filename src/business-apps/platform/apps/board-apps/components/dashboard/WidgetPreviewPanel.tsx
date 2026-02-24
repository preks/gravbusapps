/**
 * WidgetPreviewPanel - live preview of the widget being created/edited.
 * Wrapped in an error boundary so a broken config never crashes the dialog.
 */

import React, { Component, useMemo } from 'react'
import { Eye } from 'lucide-react'
import type { BoardRow, BoardColumn, DashboardWidget } from '../../types'
import { WidgetContent } from './WidgetContent'

interface ErrorBoundaryProps {
  children: React.ReactNode
  resetKey: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

class PreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-xs gba:text-destructive">
          Preview unavailable for this configuration
        </div>
      )
    }
    return this.props.children
  }
}

export interface WidgetPreviewPanelProps {
  widget: DashboardWidget | null
  columns: BoardColumn[]
  rows: BoardRow[]
  isReady: boolean
}

export const WidgetPreviewPanel: React.FC<WidgetPreviewPanelProps> = ({ widget, columns, rows, isReady }) => {
  const resetKey = useMemo(() => JSON.stringify(widget?.config ?? ''), [widget?.config])
  const previewRows = useMemo(() => rows.slice(0, 500), [rows])

  if (!isReady || !widget) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2 gba:text-muted-foreground">
        <Eye className="gba:w-6 gba:h-6 gba:opacity-30" />
        <p className="gba:text-xs gba:text-center">Configure the widget to see a live preview</p>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      <p className="gba:text-[10px] gba:text-muted-foreground gba:mb-1.5 gba:uppercase gba:tracking-wider gba:font-medium">
        Preview
      </p>
      <div className="gba:flex-1 gba:min-h-0 gba:rounded gba:border gba:border-border gba:bg-card gba:p-3 gba:overflow-auto">
        {widget.title && (
          <p className="gba:text-xs gba:font-medium gba:text-card-foreground gba:mb-2">{widget.title}</p>
        )}
        <PreviewErrorBoundary resetKey={resetKey}>
          <WidgetContent widget={widget} columns={columns} rows={previewRows} testId="widget-preview" />
        </PreviewErrorBoundary>
      </div>
    </div>
  )
}
