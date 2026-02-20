/**
 * BoardDashboardView - KPI, chart, and table widgets with management controls.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus, Sparkles } from 'lucide-react'
import type { BoardRow, BoardColumn, DashboardViewConfig, DashboardWidget } from '../types'
import { AddWidgetDialog } from '../components/dashboard/AddWidgetDialog'
import { WidgetCardWrapper } from '../components/dashboard/WidgetCardWrapper'
import { WidgetContent } from '../components/dashboard/WidgetContent'

type RenderItem =
  | { type: 'widget'; widget: DashboardWidget }
  | { type: 'dropzone'; colSpan: number; insertIdx: number; key: string }

export interface BoardDashboardViewProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  viewConfig: DashboardViewConfig
  onUpdateWidgets?: (widgets: DashboardWidget[]) => void
  accessToken?: string
  'data-testid'?: string
}

export const BoardDashboardView: React.FC<BoardDashboardViewProps> = ({
  columns,
  rows,
  viewConfig,
  onUpdateWidgets,
  accessToken,
  'data-testid': testId = 'board-dashboard'
}) => {
  const widgets = viewConfig.widgets || []
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null)
  const [isAISuggestOpen, setIsAISuggestOpen] = useState(false)
  const [dragWidgetId, setDragWidgetId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const dragCounter = useRef<Map<string, number>>(new Map())

  const handleAddWidget = (widget: DashboardWidget) => {
    onUpdateWidgets?.([...widgets, widget])
  }

  const handleEditWidget = (updated: DashboardWidget) => {
    onUpdateWidgets?.(widgets.map(w => (w.id === updated.id ? updated : w)))
    setEditingWidget(null)
  }

  const handleDeleteWidget = (widgetId: string) => {
    onUpdateWidgets?.(widgets.filter(w => w.id !== widgetId))
  }

  const handleResizeWidget = (widgetId: string, w: number) => {
    onUpdateWidgets?.(
      widgets.map(widget => (widget.id === widgetId ? { ...widget, position: { ...widget.position, w } } : widget))
    )
  }

  const handleDragStart = useCallback((widgetId: string, e: React.DragEvent) => {
    setDragWidgetId(widgetId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', widgetId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragWidgetId(null)
    setDragOverTarget(null)
    dragCounter.current.clear()
  }, [])

  const handleDragOver = useCallback((_target: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback(
    (target: string) => {
      const count = (dragCounter.current.get(target) || 0) + 1
      dragCounter.current.set(target, count)
      if (target !== dragWidgetId) {
        setDragOverTarget(target)
      }
    },
    [dragWidgetId]
  )

  const handleDragLeave = useCallback(
    (target: string) => {
      const count = (dragCounter.current.get(target) || 1) - 1
      dragCounter.current.set(target, count)
      if (count <= 0) {
        dragCounter.current.delete(target)
        if (dragOverTarget === target) {
          setDragOverTarget(null)
        }
      }
    },
    [dragOverTarget]
  )

  const moveWidget = useCallback(
    (sourceId: string, targetIdx: number) => {
      const sourceIdx = widgets.findIndex(w => w.id === sourceId)
      if (sourceIdx === -1) return
      const reordered = [...widgets]
      const [moved] = reordered.splice(sourceIdx, 1)
      const insertIdx = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx
      reordered.splice(insertIdx, 0, moved)
      onUpdateWidgets?.(reordered)
    },
    [widgets, onUpdateWidgets]
  )

  const handleDropOnWidget = useCallback(
    (targetWidgetId: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = e.dataTransfer.getData('text/plain')
      if (!sourceId || sourceId === targetWidgetId) {
        handleDragEnd()
        return
      }
      const targetIdx = widgets.findIndex(w => w.id === targetWidgetId)
      if (targetIdx === -1) {
        handleDragEnd()
        return
      }
      moveWidget(sourceId, targetIdx)
      handleDragEnd()
    },
    [widgets, moveWidget, handleDragEnd]
  )

  const handleDropOnZone = useCallback(
    (insertIdx: number, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceId = e.dataTransfer.getData('text/plain')
      if (!sourceId) {
        handleDragEnd()
        return
      }
      moveWidget(sourceId, insertIdx)
      handleDragEnd()
    },
    [moveWidget, handleDragEnd]
  )

  const getGridCols = useCallback((): number => {
    if (typeof window === 'undefined') return 4
    if (window.innerWidth >= 1024) return 4
    if (window.innerWidth >= 768) return 3
    return 2
  }, [])

  const renderItems: RenderItem[] = useMemo(() => {
    if (!dragWidgetId) {
      return widgets.map(w => ({ type: 'widget' as const, widget: w }))
    }

    const gridCols = getGridCols()
    const items: RenderItem[] = []
    let col = 0

    for (let i = 0; i < widgets.length; i++) {
      const w = Math.min(widgets[i].position.w || 1, gridCols)
      if (col + w > gridCols) {
        const gap = gridCols - col
        if (gap > 0) {
          items.push({ type: 'dropzone', colSpan: gap, insertIdx: i, key: `gap-r${items.length}` })
        }
        col = 0
      }
      items.push({ type: 'widget', widget: widgets[i] })
      col += w
    }

    const tailSpan = col > 0 && col < gridCols ? gridCols - col : 1
    items.push({ type: 'dropzone', colSpan: tailSpan, insertIdx: widgets.length, key: 'gap-tail' })

    return items
  }, [dragWidgetId, widgets, getGridCols])

  const resolveDropTarget = useCallback(
    (sourceId: string) => {
      if (!dragOverTarget || dragOverTarget === sourceId) return
      const widgetIdx = widgets.findIndex(w => w.id === dragOverTarget)
      if (widgetIdx !== -1) {
        moveWidget(sourceId, widgetIdx)
        return
      }
      const zone = renderItems.find(item => item.type === 'dropzone' && item.key === dragOverTarget)
      if (zone && zone.type === 'dropzone') {
        moveWidget(sourceId, zone.insertIdx)
        return
      }
      moveWidget(sourceId, widgets.length)
    },
    [dragOverTarget, widgets, renderItems, moveWidget]
  )

  const handleGridDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragWidgetId) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    },
    [dragWidgetId]
  )

  const handleGridDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData('text/plain')
      if (!sourceId) {
        handleDragEnd()
        return
      }
      resolveDropTarget(sourceId)
      handleDragEnd()
    },
    [resolveDropTarget, handleDragEnd]
  )

  const openAISuggest = async () => {
    setIsAISuggestOpen(true)
    const { AISuggestWidgetsDialog } = await import('../components/dashboard/AISuggestWidgetsDialog')
    setAISuggestComponent(() => AISuggestWidgetsDialog)
  }

  const [AISuggestComponent, setAISuggestComponent] = useState<React.FC<any> | null>(null)

  const colSpanClass = (w: number) => {
    switch (w) {
      case 2:
        return 'gba:col-span-2'
      case 3:
        return 'gba:col-span-3'
      case 4:
        return 'gba:col-span-4'
      default:
        return 'gba:col-span-1'
    }
  }

  if (widgets.length === 0) {
    return (
      <div className="gba:p-8 gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-center" data-testid={testId}>
        <p className="gba:text-muted-foreground gba:text-sm">No widgets yet.</p>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gba:gap-1.5"
            onClick={() => setIsAddOpen(true)}
            data-testid={`${testId}-add-widget`}
          >
            <Plus className="gba:w-3.5 gba:h-3.5" /> Add widget
          </Button>
          {accessToken && (
            <Button
              size="sm"
              variant="outline"
              className="gba:gap-1.5"
              onClick={openAISuggest}
              data-testid={`${testId}-ai-suggest`}
            >
              <Sparkles className="gba:w-3.5 gba:h-3.5" /> Suggest with AI
            </Button>
          )}
        </div>
        <AddWidgetDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          columns={columns}
          onAdd={handleAddWidget}
          data-testid={`${testId}-add-widget-dialog`}
        />
        {AISuggestComponent && accessToken && (
          <AISuggestComponent
            open={isAISuggestOpen}
            onOpenChange={setIsAISuggestOpen}
            columns={columns}
            rows={rows}
            accessToken={accessToken}
            onAddWidgets={(newWidgets: DashboardWidget[]) => onUpdateWidgets?.([...widgets, ...newWidgets])}
            data-testid={`${testId}-ai-suggest-dialog`}
          />
        )}
      </div>
    )
  }

  return (
    <div className="gba:p-4" data-testid={testId}>
      <div className="gba:flex gba:justify-end gba:mb-3 gba:gap-2">
        {accessToken && (
          <Button
            size="sm"
            variant="outline"
            className="gba:gap-1.5 gba:h-7 gba:text-xs"
            onClick={openAISuggest}
            data-testid={`${testId}-ai-suggest`}
          >
            <Sparkles className="gba:w-3 gba:h-3" /> Suggest with AI
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gba:gap-1.5 gba:h-7 gba:text-xs"
          onClick={() => {
            setEditingWidget(null)
            setIsAddOpen(true)
          }}
          data-testid={`${testId}-add-widget`}
        >
          <Plus className="gba:w-3 gba:h-3" /> Add widget
        </Button>
      </div>
      <div
        className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3"
        onDragOver={handleGridDragOver}
        onDrop={handleGridDrop}
      >
        {renderItems.map(item => {
          if (item.type === 'widget') {
            const widget = item.widget
            return (
              <div key={widget.id} className={colSpanClass(widget.position.w)}>
                <WidgetCardWrapper
                  widget={widget}
                  onEdit={onUpdateWidgets ? setEditingWidget : undefined}
                  onDelete={onUpdateWidgets ? handleDeleteWidget : undefined}
                  onResize={onUpdateWidgets ? handleResizeWidget : undefined}
                  isDragging={dragWidgetId === widget.id}
                  isDragOver={dragOverTarget === widget.id && dragWidgetId !== widget.id}
                  onDragStart={onUpdateWidgets ? e => handleDragStart(widget.id, e) : undefined}
                  onDragEnd={handleDragEnd}
                  onDragEnter={() => handleDragEnter(widget.id)}
                  onDragOver={e => handleDragOver(widget.id, e)}
                  onDragLeave={() => handleDragLeave(widget.id)}
                  onDrop={e => handleDropOnWidget(widget.id, e)}
                  testId={`${testId}-widget-${widget.id}`}
                >
                  <WidgetContent
                    widget={widget}
                    columns={columns}
                    rows={rows}
                    testId={`${testId}-widget-${widget.id}-content`}
                  />
                </WidgetCardWrapper>
              </div>
            )
          }
          return (
            <div
              key={item.key}
              className={`${colSpanClass(item.colSpan)} gba:min-h-[80px] gba:rounded-lg gba:border-2 gba:border-dashed gba:transition-all gba:duration-150 gba:flex gba:items-center gba:justify-center ${dragOverTarget === item.key ? 'gba:border-primary gba:bg-primary/10' : 'gba:border-muted-foreground/30 gba:bg-muted/20'}`}
              onDragOver={e => handleDragOver(item.key, e)}
              onDragEnter={() => handleDragEnter(item.key)}
              onDragLeave={() => handleDragLeave(item.key)}
              onDrop={e => handleDropOnZone(item.insertIdx, e)}
              data-testid={`${testId}-drop-zone-${item.key}`}
            >
              <span className="gba:text-xs gba:text-muted-foreground gba:select-none">Drop here</span>
            </div>
          )
        })}
      </div>

      <AddWidgetDialog
        open={isAddOpen || editingWidget !== null}
        onOpenChange={open => {
          if (!open) {
            setIsAddOpen(false)
            setEditingWidget(null)
          }
        }}
        columns={columns}
        onAdd={editingWidget ? handleEditWidget : handleAddWidget}
        editWidget={editingWidget}
        data-testid={`${testId}-add-widget-dialog`}
      />

      {AISuggestComponent && accessToken && (
        <AISuggestComponent
          open={isAISuggestOpen}
          onOpenChange={setIsAISuggestOpen}
          columns={columns}
          rows={rows}
          accessToken={accessToken}
          onAddWidgets={(newWidgets: DashboardWidget[]) => onUpdateWidgets?.([...widgets, ...newWidgets])}
          data-testid={`${testId}-ai-suggest-dialog`}
        />
      )}
    </div>
  )
}
