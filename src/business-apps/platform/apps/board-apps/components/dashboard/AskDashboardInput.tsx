/**
 * AskDashboardInput - unified AI entry point for dashboards.
 * Single button that expands to:
 *   1. Text input to create a specific widget from a description
 *   2. "Suggest Full Dashboard" to let AI auto-generate an optimal set of widgets
 */

import React, { useState, useCallback, lazy, Suspense } from 'react'
import { Button, Input, Spinner, Badge } from '@newwork/nw-design-system'
import { Sparkles, Plus, X, LayoutDashboard } from 'lucide-react'
import { useBoardAI } from '../../hooks/useBoardAI'
import { profileData } from '../../services/dataProfiler'
import { resolveColumnName, normalizeWidgetType } from '../../services/analyticsAggregators'
import type { BoardColumn, BoardRow, DashboardWidget } from '../../types'

const AISuggestWidgetsDialog = lazy(() =>
  import('./AISuggestWidgetsDialog').then(m => ({ default: m.AISuggestWidgetsDialog }))
)

export interface AskDashboardInputProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  accessToken: string
  onAddWidget: (widget: DashboardWidget) => void
  onAddWidgets: (widgets: DashboardWidget[]) => void
  testId: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `q_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `q_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

export const AskDashboardInput: React.FC<AskDashboardInputProps> = ({
  columns,
  rows,
  accessToken,
  onAddWidget,
  onAddWidgets,
  testId
}) => {
  const { isProcessing, error, askDashboardQuestion } = useBoardAI(accessToken)
  const [question, setQuestion] = useState('')
  const [preview, setPreview] = useState<Partial<DashboardWidget> | null>(null)
  const [explanation, setExplanation] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)

  const handleAsk = useCallback(async () => {
    if (!question.trim()) return

    const profile = profileData(columns, rows)
    const colDesc = columns.map(c => ({ name: c.name, type: c.type, label: c.label }))
    const result = await askDashboardQuestion(question, colDesc, profile)

    if (!result) return

    if (result.widgets.length > 0) {
      setPreview(result.widgets[0])
      setExplanation(result.explanation || '')
    } else {
      setPreview(null)
      setExplanation(result.explanation || 'Could not generate a widget for that question.')
    }
  }, [question, columns, rows, askDashboardQuestion])

  const normalizeAndAdd = useCallback(() => {
    if (!preview) return

    const cfg = preview.config as any
    if (!cfg) return

    const r = (ref: string) => resolveColumnName(columns, ref)
    const normalized = { ...cfg }
    if (normalized.column) normalized.column = r(normalized.column)
    if (normalized.xAxis) normalized.xAxis = r(normalized.xAxis)
    if (normalized.yAxis) normalized.yAxis = r(normalized.yAxis)
    if (normalized.groupBy) normalized.groupBy = r(normalized.groupBy)
    if (normalized.dateColumn) normalized.dateColumn = r(normalized.dateColumn)
    if (normalized.xColumn) normalized.xColumn = r(normalized.xColumn)
    if (normalized.yColumn) normalized.yColumn = r(normalized.yColumn)
    if (Array.isArray(normalized.columns)) {
      normalized.columns = normalized.columns.map((c: string) => r(c))
    }
    if (Array.isArray(normalized.series)) {
      normalized.series = normalized.series.map((s: any) => ({ ...s, column: s.column ? r(s.column) : s.column }))
    }

    const resolvedType = normalizeWidgetType(String(normalized.type || preview.type || 'kpi'))
    const rawFilters = (preview as any).filters
    let normalizedFilters: DashboardWidget['filters'] | undefined
    if (rawFilters?.filters?.length) {
      normalizedFilters = {
        connector: rawFilters.connector || 'and',
        filters: rawFilters.filters.map((f: any) => ({
          ...f,
          id: f.id || `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          column: f.column ? r(f.column) : f.column
        }))
      }
    }

    const widget: DashboardWidget = {
      id: createId(),
      type: resolvedType as DashboardWidget['type'],
      title: preview.title || question.slice(0, 50),
      config: { ...normalized, type: resolvedType },
      position: preview.position || { x: 0, y: 0, w: resolvedType === 'kpi' ? 1 : 2, h: 1 },
      filters: normalizedFilters
    }

    onAddWidget(widget)
    setPreview(null)
    setQuestion('')
    setExplanation('')
  }, [preview, question, columns, onAddWidget])

  const handleDismiss = () => {
    setPreview(null)
    setExplanation('')
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    handleDismiss()
  }

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gba:gap-1.5 gba:h-7 gba:text-xs"
        onClick={() => setIsExpanded(true)}
        data-testid={`${testId}-ai-toggle`}
      >
        <Sparkles className="gba:w-3 gba:h-3" />
        AI Widgets
      </Button>
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-2 gba:w-full gba:max-w-lg" data-testid={`${testId}-ai-panel`}>
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <Input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Describe a widget..."
            className="gba:h-7 gba:text-xs gba:flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            disabled={isProcessing}
            data-testid={`${testId}-ai-question`}
          />
          <Button
            size="sm"
            className="gba:h-7 gba:text-xs"
            onClick={handleAsk}
            disabled={isProcessing || !question.trim()}
            data-testid={`${testId}-ai-create`}
          >
            {isProcessing ? <Spinner className="gba:w-3 gba:h-3" /> : 'Create'}
          </Button>
          <span className="gba:text-[10px] gba:text-muted-foreground gba:px-1">or</span>
          <Button
            variant="outline"
            size="sm"
            className="gba:h-7 gba:text-xs gba:gap-1 gba:whitespace-nowrap"
            onClick={() => setIsSuggestOpen(true)}
            data-testid={`${testId}-ai-suggest-all`}
          >
            <LayoutDashboard className="gba:w-3 gba:h-3" /> Suggest All
          </Button>
          <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7" onClick={handleCollapse}>
            <X className="gba:w-3.5 gba:h-3.5" />
          </Button>
        </div>

        {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}

        {explanation && !preview && <p className="gba:text-xs gba:text-muted-foreground gba:px-1">{explanation}</p>}

        {preview && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded gba:border gba:border-border gba:bg-muted/30">
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <span className="gba:text-xs gba:font-medium">{preview.title}</span>
                <Badge variant="secondary" className="gba:text-xs">
                  {(preview.config as any)?.type || preview.type}
                </Badge>
              </div>
              {explanation && <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{explanation}</p>}
            </div>
            <Button
              size="sm"
              className="gba:h-7 gba:text-xs gba:gap-1"
              onClick={normalizeAndAdd}
              data-testid={`${testId}-ai-add`}
            >
              <Plus className="gba:w-3 gba:h-3" /> Add
            </Button>
            <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7" onClick={handleDismiss}>
              <X className="gba:w-3 gba:h-3" />
            </Button>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <AISuggestWidgetsDialog
          open={isSuggestOpen}
          onOpenChange={setIsSuggestOpen}
          columns={columns}
          rows={rows}
          accessToken={accessToken}
          onAddWidgets={onAddWidgets}
          data-testid={`${testId}-ai-suggest-dialog`}
        />
      </Suspense>
    </>
  )
}
