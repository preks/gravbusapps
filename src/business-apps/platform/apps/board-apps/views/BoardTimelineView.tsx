/**
 * BoardTimelineView - Gantt-style timeline with drag, resize,
 * dependency creation, zoom, configurable columns, and dependency arrows.
 */

import React, { useMemo, useCallback, useState } from 'react'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Label } from '@newwork/nw-design-system'
import { GitBranch, Link2, ZoomIn, ZoomOut } from 'lucide-react'
import type { BoardRow, BoardColumn, TimelineViewConfig, DependencyMeta, DependencyType } from '../types'
import { generateFlowDependencies } from '../services/flowEngine/generateFlowDependencies'
import { TimelineSvg } from './timeline/TimelineSvg'
import type { ZoomLevel } from './timeline/TimelineSvg'
import { DependencyEditorPanel } from './timeline/DependencyEditorPanel'

const ZOOM_LEVELS: ZoomLevel[] = ['quarter', 'month', 'week', 'day']
const ZOOM_LABELS: Record<ZoomLevel, string> = { day: 'Day', week: 'Week', month: 'Month', quarter: 'Quarter' }

export interface BoardTimelineViewProps {
  rows: BoardRow[]
  columns?: BoardColumn[]
  viewConfig: TimelineViewConfig
  onRowClick?: (row: BoardRow) => void
  onUpdateCell?: (
    rowId: string,
    columnName: string,
    value: unknown,
    extraData?: Record<string, unknown>
  ) => Promise<void>
  onUpdateView?: (config: Partial<TimelineViewConfig>) => void
  'data-testid'?: string
}

export const BoardTimelineView: React.FC<BoardTimelineViewProps> = ({
  rows,
  columns = [],
  viewConfig,
  onRowClick,
  onUpdateCell,
  onUpdateView,
  'data-testid': testId = 'board-timeline'
}) => {
  const { startDateColumn, endDateColumn, titleColumn, dependencyColumn } = viewConfig

  const dateCandidates = useMemo(() => columns.filter(c => c.type === 'date' || c.type === 'datetime'), [columns])
  const relationCandidates = useMemo(() => columns.filter(c => c.type === 'relation'), [columns])

  const handleConfigChange = useCallback(
    (field: keyof TimelineViewConfig, value: string) => {
      if (!onUpdateView) return
      onUpdateView({ [field]: value === '__none__' ? undefined : value })
    },
    [onUpdateView]
  )

  const depMetaByRow = useMemo(() => {
    if (!dependencyColumn) return new Map<string, DependencyMeta>()
    const metaKey = `_dep_${dependencyColumn}`
    const map = new Map<string, DependencyMeta>()
    for (const row of rows) {
      const raw = row.data[metaKey]
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) map.set(row.id, raw as DependencyMeta)
    }
    return map
  }, [rows, dependencyColumn])

  const edges = useMemo(() => {
    if (!dependencyColumn) return []
    const result: Array<{ from: string; to: string; type: DependencyType }> = []
    for (const row of rows) {
      const predIds = row.data[dependencyColumn]
      if (!Array.isArray(predIds)) continue
      const meta = depMetaByRow.get(row.id) || {}
      for (const pid of predIds) {
        if (typeof pid === 'string') result.push({ from: pid, to: row.id, type: meta[pid] || 'FS' })
      }
    }
    return result
  }, [rows, dependencyColumn, depMetaByRow])

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<BoardRow | null>(null)
  const [zoom, setZoom] = useState<ZoomLevel>('day')

  const handleLabelClick = useCallback(
    (row: BoardRow) => {
      onRowClick?.(row)
    },
    [onRowClick]
  )
  const handleBarSelect = useCallback((row: BoardRow) => {
    setSelectedRowId(prev => (prev === row.id ? null : row.id))
  }, [])

  const handleBarDrag = useCallback(
    async (rowId: string, s: string, e: string) => {
      if (!onUpdateCell) return
      await onUpdateCell(rowId, startDateColumn, s)
      await onUpdateCell(rowId, endDateColumn, e)
    },
    [onUpdateCell, startDateColumn, endDateColumn]
  )

  const handleResizeStart = useCallback(
    async (rowId: string, s: string) => {
      if (!onUpdateCell) return
      await onUpdateCell(rowId, startDateColumn, s)
    },
    [onUpdateCell, startDateColumn]
  )

  const handleResizeEnd = useCallback(
    async (rowId: string, e: string) => {
      if (!onUpdateCell) return
      await onUpdateCell(rowId, endDateColumn, e)
    },
    [onUpdateCell, endDateColumn]
  )

  const handleDependencyCreate = useCallback(
    async (fromRowId: string, toRowId: string) => {
      if (!onUpdateCell || !dependencyColumn) return
      const target = rows.find(r => r.id === toRowId)
      if (!target) return
      const ids: string[] = Array.isArray(target.data[dependencyColumn])
        ? (target.data[dependencyColumn] as string[])
        : []
      if (ids.includes(fromRowId)) return
      const mk = `_dep_${dependencyColumn}`
      const em =
        target.data[mk] && typeof target.data[mk] === 'object' && !Array.isArray(target.data[mk])
          ? (target.data[mk] as DependencyMeta)
          : {}
      await onUpdateCell(toRowId, dependencyColumn, [...ids, fromRowId], { [mk]: { ...em, [fromRowId]: 'FS' } })
    },
    [onUpdateCell, dependencyColumn, rows]
  )

  const handleDepSave = useCallback(
    async (rowId: string, predIds: string[], depMeta: DependencyMeta) => {
      if (!onUpdateCell || !dependencyColumn) return
      await onUpdateCell(rowId, dependencyColumn, predIds, { [`_dep_${dependencyColumn}`]: depMeta })
      setEditingRow(null)
    },
    [onUpdateCell, dependencyColumn]
  )

  const hasFlowRows = useMemo(
    () => rows.some(r => r.data.flowId && r.data.stepIndex != null && r.data.templateId),
    [rows]
  )
  const [generating, setGenerating] = useState(false)
  const handleGenerateFlowDeps = useCallback(async () => {
    if (!onUpdateCell || !dependencyColumn) return
    setGenerating(true)
    try {
      const deps = await generateFlowDependencies(rows, dependencyColumn)
      const mk = `_dep_${dependencyColumn}`
      for (const dep of deps) await onUpdateCell(dep.rowId, dependencyColumn, dep.predecessorIds, { [mk]: dep.depMeta })
    } finally {
      setGenerating(false)
    }
  }, [rows, dependencyColumn, onUpdateCell])

  const selectedRow = useMemo(
    () => (selectedRowId ? (rows.find(r => r.id === selectedRowId) ?? null) : null),
    [rows, selectedRowId]
  )
  const showConfigBar = onUpdateView && columns.length > 0

  const zoomIdx = ZOOM_LEVELS.indexOf(zoom)
  const canZoomIn = zoomIdx < ZOOM_LEVELS.length - 1
  const canZoomOut = zoomIdx > 0

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      {showConfigBar && (
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-1.5 gba:border-b gba:bg-card gba:flex-wrap">
          <CfgSelect
            label="Start"
            value={startDateColumn}
            options={dateCandidates}
            onChange={v => handleConfigChange('startDateColumn', v)}
            testId={`${testId}-cfg-start`}
          />
          <CfgSelect
            label="End"
            value={endDateColumn}
            options={dateCandidates}
            onChange={v => handleConfigChange('endDateColumn', v)}
            testId={`${testId}-cfg-end`}
          />
          <CfgSelect
            label="Label"
            value={titleColumn}
            options={columns}
            onChange={v => handleConfigChange('titleColumn', v)}
            testId={`${testId}-cfg-title`}
          />
          {relationCandidates.length > 0 && (
            <CfgSelect
              label="Deps"
              value={dependencyColumn || '__none__'}
              options={relationCandidates}
              allowNone
              onChange={v => handleConfigChange('dependencyColumn', v)}
              testId={`${testId}-cfg-deps`}
            />
          )}

          <div className="gba:h-5 gba:w-px gba:bg-border" />

          <div className="gba:flex gba:items-center gba:rounded gba:border gba:border-border gba:overflow-hidden">
            <button
              type="button"
              disabled={!canZoomOut}
              onClick={() => setZoom(ZOOM_LEVELS[zoomIdx - 1])}
              className="gba:px-1.5 gba:py-1 gba:text-muted-foreground gba:hover:bg-muted gba:disabled:opacity-30 gba:cursor-pointer gba:disabled:cursor-default"
              data-testid={`${testId}-zoom-out`}
            >
              <ZoomOut className="gba:w-3.5 gba:h-3.5" />
            </button>
            <span className="gba:px-2 gba:text-xs gba:font-medium gba:text-foreground gba:select-none gba:min-w-[52px] gba:text-center">
              {ZOOM_LABELS[zoom]}
            </span>
            <button
              type="button"
              disabled={!canZoomIn}
              onClick={() => setZoom(ZOOM_LEVELS[zoomIdx + 1])}
              className="gba:px-1.5 gba:py-1 gba:text-muted-foreground gba:hover:bg-muted gba:disabled:opacity-30 gba:cursor-pointer gba:disabled:cursor-default"
              data-testid={`${testId}-zoom-in`}
            >
              <ZoomIn className="gba:w-3.5 gba:h-3.5" />
            </button>
          </div>

          {dependencyColumn && hasFlowRows && onUpdateCell && (
            <Button
              variant="outline"
              size="sm"
              className="gba:h-7 gba:text-xs gba:gap-1.5"
              onClick={handleGenerateFlowDeps}
              disabled={generating}
              data-testid={`${testId}-gen-flow-deps`}
            >
              <GitBranch className="gba:w-3 gba:h-3" />
              {generating ? 'Generating...' : 'Auto-link flows'}
            </Button>
          )}
          {selectedRow && dependencyColumn && onUpdateCell && (
            <Button
              variant="outline"
              size="sm"
              className="gba:h-7 gba:text-xs gba:gap-1.5"
              onClick={() => setEditingRow(selectedRow)}
              data-testid={`${testId}-edit-deps`}
            >
              <Link2 className="gba:w-3 gba:h-3" />
              Edit deps
            </Button>
          )}
        </div>
      )}

      <div className="gba:flex gba:flex-1 gba:min-h-0">
        <TimelineSvg
          rows={rows}
          startDateColumn={startDateColumn}
          endDateColumn={endDateColumn}
          titleColumn={titleColumn}
          edges={edges}
          zoom={zoom}
          selectedRowId={selectedRowId}
          onLabelClick={handleLabelClick}
          onBarSelect={handleBarSelect}
          onBarDrag={onUpdateCell ? handleBarDrag : undefined}
          onBarResizeStart={onUpdateCell ? handleResizeStart : undefined}
          onBarResizeEnd={onUpdateCell ? handleResizeEnd : undefined}
          onDependencyCreate={dependencyColumn && onUpdateCell ? handleDependencyCreate : undefined}
          testId={testId}
        />
        {editingRow && dependencyColumn && onUpdateCell && (
          <DependencyEditorPanel
            row={editingRow}
            allRows={rows}
            dependencyColumn={dependencyColumn}
            titleColumn={titleColumn}
            onSave={handleDepSave}
            onClose={() => setEditingRow(null)}
            data-testid={`${testId}-dep-editor`}
          />
        )}
      </div>
    </div>
  )
}

const CfgSelect: React.FC<{
  label: string
  value: string
  options: BoardColumn[]
  allowNone?: boolean
  onChange: (v: string) => void
  testId: string
}> = ({ label, value, options, allowNone, onChange, testId }) => (
  <div className="gba:flex gba:items-center gba:gap-1.5">
    <Label className="gba:text-[10px] gba:text-muted-foreground gba:whitespace-nowrap gba:uppercase gba:tracking-wide">
      {label}
    </Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="gba:h-7 gba:text-xs gba:w-32 gba:rounded" data-testid={testId}>
        <SelectValue placeholder={allowNone ? 'None' : 'Select'} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none__">None</SelectItem>}
        {options.map(c => (
          <SelectItem key={c.id} value={c.name}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)
