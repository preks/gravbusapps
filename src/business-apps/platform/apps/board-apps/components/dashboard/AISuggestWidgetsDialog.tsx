/**
 * AISuggestWidgetsDialog - AI profiles board data then suggests optimal dashboard widgets.
 * Uses deterministic data profiling (column stats, correlations) instead of raw sample rows.
 */

import React, { useState, useCallback, useMemo } from 'react'
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
import { Sparkles, BarChart3, Hash, Table2, LineChart, ScatterChart, Activity, BarChart } from 'lucide-react'
import { useBoardAI } from '../../hooks/useBoardAI'
import type { BoardColumn, BoardRow, DashboardWidget } from '../../types'
import { profileData } from '../../services/dataProfiler'
import { resolveColumnName, normalizeWidgetType } from '../../services/analyticsAggregators'

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
  multi_chart: <BarChart className="gba:w-3.5 gba:h-3.5" />,
  timeseries: <LineChart className="gba:w-3.5 gba:h-3.5" />,
  scatter: <ScatterChart className="gba:w-3.5 gba:h-3.5" />,
  histogram: <Activity className="gba:w-3.5 gba:h-3.5" />,
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
  const [profilingStatus, setProfilingStatus] = useState('')

  const handleGenerate = useCallback(async () => {
    setProfilingStatus('Profiling data...')
    const profile = profileData(columns, rows)
    setProfilingStatus('Asking AI for suggestions...')

    const colDesc = columns.map(c => ({ name: c.name, type: c.type, label: c.label }))
    const result = await suggestWidgets(colDesc, [], profile)
    setProfilingStatus('')
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

  const normalizeWidgetConfig = useCallback(
    (cfg: any): any => {
      if (!cfg) return cfg
      const normalized = { ...cfg }
      const r = (ref: string) => resolveColumnName(columns, ref)
      if (normalized.column) normalized.column = r(normalized.column)
      if (normalized.xAxis) normalized.xAxis = r(normalized.xAxis)
      if (normalized.yAxis) normalized.yAxis = r(normalized.yAxis)
      if (normalized.groupBy) normalized.groupBy = r(normalized.groupBy)
      if (normalized.dateColumn) normalized.dateColumn = r(normalized.dateColumn)
      if (normalized.xColumn) normalized.xColumn = r(normalized.xColumn)
      if (normalized.yColumn) normalized.yColumn = r(normalized.yColumn)
      if (normalized.breakdown) normalized.breakdown = r(normalized.breakdown)
      if (normalized.labelColumn) normalized.labelColumn = r(normalized.labelColumn)
      if (Array.isArray(normalized.columns)) {
        normalized.columns = normalized.columns.map((c: string) => r(c))
      }
      if (Array.isArray(normalized.series)) {
        normalized.series = normalized.series.map((s: any) => ({
          ...s,
          column: s.column ? r(s.column) : s.column
        }))
      }
      return normalized
    },
    [columns]
  )

  const handleAdd = useCallback(() => {
    const selected = suggestions
      .filter(w => selectedIds.has(w.id!))
      .map(w => {
        const rawType = (w.config as any)?.type || w.type || 'kpi'
        const resolvedType = normalizeWidgetType(rawType)
        const normalizedConfig = normalizeWidgetConfig(w.config) || { column: '', aggregation: 'count' }
        return {
          id: createId(),
          type: resolvedType,
          title: w.title || 'Widget',
          config: { ...normalizedConfig, type: resolvedType },
          position: w.position || { x: 0, y: 0, w: resolvedType === 'kpi' ? 1 : 2, h: 1 }
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
    setProfilingStatus('')
  }

  const profileSummary = useMemo(() => {
    if (!open || rows.length === 0) return null
    const numericCount = columns.filter(c => ['number', 'currency', 'percentage'].includes(c.type)).length
    const dateCount = columns.filter(c => ['date', 'datetime'].includes(c.type)).length
    const catCount = columns.filter(c => ['select', 'multiselect', 'status'].includes(c.type)).length
    return { numericCount, dateCount, catCount }
  }, [open, rows.length, columns])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
            AI Dashboard Builder
          </DialogTitle>
        </DialogHeader>

        <div className="gba:py-2 gba:space-y-3">
          {!hasGenerated && !isProcessing && (
            <div className="gba:text-center gba:space-y-3">
              <p className="gba:text-sm gba:text-muted-foreground">
                AI will profile your board data ({columns.length} columns, {rows.length} rows) to understand
                distributions, correlations, and trends, then suggest an optimal dashboard.
              </p>
              {profileSummary && (
                <div className="gba:flex gba:gap-2 gba:justify-center">
                  {profileSummary.numericCount > 0 && (
                    <Badge variant="secondary">{profileSummary.numericCount} numeric</Badge>
                  )}
                  {profileSummary.dateCount > 0 && <Badge variant="secondary">{profileSummary.dateCount} date</Badge>}
                  {profileSummary.catCount > 0 && (
                    <Badge variant="secondary">{profileSummary.catCount} categorical</Badge>
                  )}
                </div>
              )}
              <Button onClick={handleGenerate} className="gba:gap-1.5" data-testid={`${testId}-generate`}>
                <Sparkles className="gba:w-4 gba:h-4" /> Profile & Suggest
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-6">
              <Spinner size="lg" />
              <p className="gba:text-sm gba:text-muted-foreground">{profilingStatus || 'Analyzing...'}</p>
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
              <div className="gba:space-y-2 gba:max-h-72 gba:overflow-auto">
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
                        {WIDGET_TYPE_ICONS[normalizeWidgetType((w.config as any)?.type || w.type || 'kpi')] || (
                          <BarChart3 className="gba:w-3.5 gba:h-3.5" />
                        )}
                        <span className="gba:text-sm gba:font-medium">{w.title}</span>
                        <Badge variant="secondary" className="gba:text-xs">
                          {normalizeWidgetType((w.config as any)?.type || w.type || 'kpi')}
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
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isProcessing}
                data-testid={`${testId}-regenerate`}
              >
                Regenerate
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={selectedIds.size === 0} data-testid={`${testId}-add`}>
                Add {selectedIds.size} widget{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function describeWidget(w: Partial<DashboardWidget>): string {
  const cfg = w.config as any
  if (!cfg) return ''
  const widgetType = normalizeWidgetType(cfg.type || w.type || 'kpi')
  switch (widgetType) {
    case 'kpi':
      return `${cfg.aggregation} of ${cfg.column}${cfg.format ? ` (${cfg.format})` : ''}`
    case 'chart':
      return `${cfg.chartType} chart: ${cfg.xAxis} vs ${cfg.yAxis} (${cfg.aggregation || 'count'})`
    case 'multi_chart':
      return `${cfg.chartType}: ${cfg.groupBy} × ${(cfg.series || []).map((s: any) => s.label || s.column).join(', ')}`
    case 'timeseries':
      return `${cfg.chartType || 'line'} over ${cfg.dateColumn} (${cfg.bucket}): ${(cfg.series || []).map((s: any) => s.label || s.column).join(', ')}`
    case 'scatter':
      return `${cfg.xColumn} vs ${cfg.yColumn}${cfg.labelColumn ? ` (label: ${cfg.labelColumn})` : ''}`
    case 'histogram':
      return `Distribution of ${cfg.column}${cfg.bins ? ` (${cfg.bins} bins)` : ''}`
    case 'table':
      return `Top ${cfg.limit || 10} rows: ${(cfg.columns || []).join(', ')}`
    default:
      return JSON.stringify(cfg).slice(0, 60)
  }
}
