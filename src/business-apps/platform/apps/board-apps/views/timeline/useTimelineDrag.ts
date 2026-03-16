/**
 * useTimelineDrag - encapsulates pointer-based drag/resize/connect
 * interactions for the Gantt timeline SVG.
 */

import { useState, useCallback, useRef } from 'react'

export interface BarGeo {
  x: number
  y: number
  w: number
  h: number
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'connect'

interface DragState {
  mode: DragMode
  rowId: string
  startX: number
  origGeo: BarGeo
  origStart: Date
  origEnd: Date
}

interface ParsedItemRef {
  start: Date
  end: Date
}

const MS_PER_DAY = 86_400_000

function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function findBarAtPoint(x: number, y: number, excludeId: string, geo: Map<string, BarGeo>): string | null {
  for (const [id, g] of geo) {
    if (id === excludeId) continue
    if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) return id
  }
  return null
}

export interface UseTimelineDragOpts {
  dayWidth: number
  barGeometry: Map<string, BarGeo>
  itemById: Map<string, ParsedItemRef>
  onBarDrag?: (rowId: string, newStart: string, newEnd: string) => void
  onBarResizeStart?: (rowId: string, newStart: string) => void
  onBarResizeEnd?: (rowId: string, newEnd: string) => void
  onDependencyCreate?: (fromRowId: string, toRowId: string) => void
}

export function useTimelineDrag(opts: UseTimelineDragOpts) {
  const { dayWidth, barGeometry, itemById, onBarDrag, onBarResizeStart, onBarResizeEnd, onDependencyCreate } = opts

  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragDelta, setDragDelta] = useState(0)
  const [connectTarget, setConnectTarget] = useState<string | null>(null)
  const [connectMouse, setConnectMouse] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: clientX, y: clientY }
    const svgPt = pt.matrixTransform(ctm.inverse())
    return { x: svgPt.x, y: svgPt.y }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, rowId: string, mode: DragMode) => {
      e.stopPropagation()
      e.preventDefault()
      const geo = barGeometry.get(rowId)
      const item = itemById.get(rowId)
      if (!geo || !item) return
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      const pt = getSvgPoint(e.clientX, e.clientY)
      setDrag({ mode, rowId, startX: pt.x, origGeo: geo, origStart: item.start, origEnd: item.end })
      setDragDelta(0)
      if (mode === 'connect') setConnectMouse(pt)
    },
    [barGeometry, itemById, getSvgPoint]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return
      const pt = getSvgPoint(e.clientX, e.clientY)
      if (drag.mode === 'connect') {
        setConnectMouse(pt)
        setConnectTarget(findBarAtPoint(pt.x, pt.y, drag.rowId, barGeometry))
      } else {
        setDragDelta(pt.x - drag.startX)
      }
    },
    [drag, getSvgPoint, barGeometry]
  )

  const handlePointerUp = useCallback(() => {
    if (!drag) return
    const daysDelta = Math.round(dragDelta / dayWidth)
    if (drag.mode === 'connect') {
      if (connectTarget && onDependencyCreate) onDependencyCreate(drag.rowId, connectTarget)
      setConnectMouse(null)
      setConnectTarget(null)
    } else if (daysDelta !== 0) {
      const msD = daysDelta * MS_PER_DAY
      if (drag.mode === 'move' && onBarDrag) {
        onBarDrag(
          drag.rowId,
          dateToIso(new Date(drag.origStart.getTime() + msD)),
          dateToIso(new Date(drag.origEnd.getTime() + msD))
        )
      } else if (drag.mode === 'resize-left' && onBarResizeStart) {
        const ns = new Date(drag.origStart.getTime() + msD)
        if (ns < drag.origEnd) onBarResizeStart(drag.rowId, dateToIso(ns))
      } else if (drag.mode === 'resize-right' && onBarResizeEnd) {
        const ne = new Date(drag.origEnd.getTime() + msD)
        if (ne > drag.origStart) onBarResizeEnd(drag.rowId, dateToIso(ne))
      }
    }
    setDrag(null)
    setDragDelta(0)
  }, [drag, dragDelta, dayWidth, connectTarget, onBarDrag, onBarResizeStart, onBarResizeEnd, onDependencyCreate])

  return {
    svgRef,
    drag,
    dragDelta,
    connectTarget,
    connectMouse,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  }
}
