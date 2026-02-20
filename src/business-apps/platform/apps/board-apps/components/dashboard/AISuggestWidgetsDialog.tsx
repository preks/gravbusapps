/**
 * AISuggestWidgetsDialog - AI analyzes board data and suggests useful dashboard widgets.
 */

import React, { useState, useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Checkbox,
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import { Sparkles, BarChart3, Hash, Table2 } from 'lucide-react'
import { useBoardAI } from '../../hooks/useBoardAI'
import type { BoardColumn, BoardRow, DashboardWidget } from '../../types'

export interface AISuggestWidgetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: BoardColumn[]
  rows: BoardRow[]
  accessToken: string
  onAddWidgets: (widgets: DashboardWidget[]) => void
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

const WIDGET_TYPE_ICONS: Record<string, React.ReactNode> = {
  kpi: <Hash className="gba:w-3.5 gba:h-3.5" />,
  chart: <BarChart3 className="gba:w-3.5 gba:h-3.5" />,
  table: <Table2 className="gba:w-3.5 gba:h-3.5" />
}

export const AISuggestWidgetsDialog: React.FC<AISuggestWidgetsDialogProps> = ({
  open,
  onOpenChange,
  columns,
  rows,
  accessToken,
  onAddWidgets,
  'data-testid': testId = 'ai-suggest-widgets-dialog'
}) => {
  const { isProcessing, error, suggestWidgets } = useBoardAI(accessToken)
  const [suggestions, setSuggestions] = useState<Partial<DashboardWidget>[]>([])
  const [explanation, setExplanation] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerate = useCallback(async () => {
    const colDesc = columns.map(c => ({ name: c.name, type: c.type, label: c.label }))
    const sampleRows = rows.slice(0, 5).map(r => r.data)

    const result = await suggestWidgets(colDesc, sampleRows)
    if (!result) return

    const widgets = (result.widgets || []).map((w, i) => ({
      ...w,
      id: w.id || `ai_${i}_${Date.now()}`
    }))
    setSuggestions(widgets)
    setExplanation(result.explanation || '')
    setSelectedIds(new Set(widgets.map(w => w.id!)))
    setHasGenerated(true)
  }, [columns, rows, suggestWidgets])

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resolveColumnName = useCallback(
    (ref: string): string => {
      if (!ref) return ref
      const exact = columns.find(c => c.name === ref)
      if (exact) return exact.name
      const byLabel = columns.find(c => c.label.toLowerCase() === ref.toLowerCase())
      if (byLabel) return byLabel.name
      const byId = columns.find(c => c.id === ref)
      if (byId) return byId.name
      const partial = columns.find(
        c => c.name.toLowerCase().includes(ref.toLowerCase()) || c.label.toLowerCase().includes(ref.toLowerCase())
      )
      if (partial) return partial.name
      return ref
    },
    [columns]
  )

  const normalizeWidgetConfig = useCallback(
    (cfg: any): any => {
      if (!cfg) return cfg
      const normalized = { ...cfg }
      if (normalized.column) normalized.column = resolveColumnName(normalized.column)
      if (normalized.xAxis) normalized.xAxis = resolveColumnName(normalized.xAxis)
      if (normalized.yAxis) normalized.yAxis = resolveColumnName(normalized.yAxis)
      if (Array.isArray(normalized.columns)) {
        normalized.columns = normalized.columns.map((c: string) => resolveColumnName(c))
      }
      return normalized
    },
    [resolveColumnName]
  )

  const handleAdd = useCallback(() => {
    const selected = suggestions
      .filter(w => selectedIds.has(w.id!))
      .map(w => {
        const resolvedType = (w.config as any)?.type || w.type || 'kpi'
        const normalizedConfig = normalizeWidgetConfig(w.config) || { column: '', aggregation: 'count' }
        return {
          id: createId(),
          type: resolvedType,
          title: w.title || 'Widget',
          config: { ...normalizedConfig, type: resolvedType },
          position: w.position || { x: 0, y: 0, w: 1, h: 1 }
        } as DashboardWidget
      })

    onAddWidgets(selected)
    onOpenChange(false)
    setSuggestions([])
    setHasGenerated(false)
    setSelectedIds(new Set())
  }, [suggestions, selectedIds, onAddWidgets, onOpenChange, normalizeWidgetConfig])

  const handleClose = () => {
    onOpenChange(false)
    setSuggestions([])
    setHasGenerated(false)
    setSelectedIds(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
            AI Widget Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="gba:py-2 gba:space-y-3">
          {!hasGenerated && !isProcessing && (
            <div className="gba:text-center gba:space-y-3">
              <p className="gba:text-sm gba:text-muted-foreground">
                AI will analyze your board data ({columns.length} columns, {rows.length} rows) and suggest dashboard
                widgets that provide meaningful insights.
              </p>
              <Button onClick={handleGenerate} className="gba:gap-1.5" data-testid={`${testId}-generate`}>
                <Sparkles className="gba:w-4 gba:h-4" /> Analyze & Suggest
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-6">
              <Spinner size="lg" />
              <p className="gba:text-sm gba:text-muted-foreground">Analyzing your data...</p>
            </div>
          )}

          {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}

          {hasGenerated && suggestions.length > 0 && (
            <>
              {explanation && (
                <p className="gba:text-xs gba:text-muted-foreground gba:bg-muted/50 gba:rounded gba:p-2">
                  {explanation}
                </p>
              )}
              <div className="gba:space-y-2 gba:max-h-64 gba:overflow-auto">
                {suggestions.map(w => (
                  <label
                    key={w.id}
                    className="gba:flex gba:items-start gba:gap-3 gba:p-2 gba:rounded gba:border gba:border-border gba:cursor-pointer gba:hover:bg-accent/30"
                  >
                    <Checkbox
                      checked={selectedIds.has(w.id!)}
                      onCheckedChange={() => toggleSelection(w.id!)}
                      className="gba:mt-0.5"
                      data-testid={`${testId}-check-${w.id}`}
                    />
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        {WIDGET_TYPE_ICONS[(w.config as any)?.type || w.type || 'kpi']}
                        <span className="gba:text-sm gba:font-medium">{w.title}</span>
                        <Badge variant="secondary" className="gba:text-xs">
                          {(w.config as any)?.type || w.type}
                        </Badge>
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{describeWidget(w)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {hasGenerated && suggestions.length === 0 && !isProcessing && (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
              No suggestions generated. Try adding more data to the board.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          {hasGenerated && suggestions.length > 0 && (
            <Button size="sm" onClick={handleAdd} disabled={selectedIds.size === 0} data-testid={`${testId}-add`}>
              Add {selectedIds.size} widget{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function describeWidget(w: Partial<DashboardWidget>): string {
  const cfg = w.config as any
  if (!cfg) return ''
  const widgetType = cfg.type || w.type || 'kpi'
  switch (widgetType) {
    case 'kpi':
      return `${cfg.aggregation} of ${cfg.column}${cfg.format ? ` (${cfg.format})` : ''}`
    case 'chart':
      return `${cfg.chartType} chart: ${cfg.xAxis} vs ${cfg.yAxis} (${cfg.aggregation || 'count'})`
    case 'table':
      return `Top ${cfg.limit || 10} rows: ${(cfg.columns || []).join(', ')}`
    default:
      return ''
  }
}
