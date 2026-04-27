/**
 * ShapePointEditor
 *
 * PowerPoint-style "Edit Points" overlay. Mounted on top of a shape when the
 * user enters point-editing mode. Renders draggable anchor handles (and their
 * bezier control points when present) directly over the shape's SVG, and
 * writes back through `geometry.custGeomPath` so undo/redo and PPTX export
 * work without special cases.
 *
 * Coordinates model:
 *   - The shape renders inside a `position: absolute; left/top/w/h` box.
 *   - Anchors are stored in the unit box `[0..1, 0..1]` (matches
 *     `custGeomPath`); we scale by the shape's size when rendering handles and
 *     convert back on drag.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ShapeElement } from './slideElements'
import { getShapeGeometry } from './slideElements'
import {
  customPathToNodes,
  nodesToCustomPath,
  presetToCustomPath,
  clonePathData,
  type PathData,
  type PathNode,
  type Point
} from './shapePathGeometry'

export interface ShapePointEditorProps {
  element: ShapeElement
  scale?: number
  onChangePath: (nextPath: string) => void
  onExit: () => void
  testId?: string
}

const HANDLE_RADIUS = 5
const CONTROL_RADIUS = 3

interface DragState {
  subIndex: number
  nodeIndex: number
  kind: 'anchor' | 'in' | 'out'
  startClient: Point
  startPoint: Point
}

/**
 * Best-effort conversion of the element's current geometry into an editable
 * path. Prefers an existing `custGeomPath` (imported or previously edited);
 * otherwise seeds from the preset so users can immediately drag anchors on
 * any shape.
 */
function deriveEditablePath(element: ShapeElement): PathData {
  const geom = getShapeGeometry(element)
  const w = element.size.width
  const h = element.size.height
  if (geom?.custGeomPath) return customPathToNodes(geom.custGeomPath)
  if (geom?.prst) return presetToCustomPath(geom.prst, geom.adjustments, w, h).data
  // No preset and no custom path — derive from native shape type as best we
  // can via the preset converter's default rectangle fallback.
  return presetToCustomPath('rect', undefined, w, h).data
}

/**
 * Edit Points overlay. Rendered above the shape, fills its bounding box, and
 * reads/writes the shape's custom path on every drag so the rendered preview
 * stays in sync with the anchors.
 */
export const ShapePointEditor: React.FC<ShapePointEditorProps> = ({
  element,
  scale = 1,
  onChangePath,
  onExit,
  testId
}) => {
  const [data, setData] = useState<PathData>(() => deriveEditablePath(element))
  const [drag, setDrag] = useState<DragState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = element.size.width
  const height = element.size.height

  const startDrag = useCallback(
    (e: React.MouseEvent, subIndex: number, nodeIndex: number, kind: DragState['kind']) => {
      e.preventDefault()
      e.stopPropagation()
      const node = data.subpaths[subIndex]?.nodes[nodeIndex]
      if (!node) return
      const start = kind === 'anchor' ? node.point : kind === 'in' ? (node.in ?? node.point) : (node.out ?? node.point)
      setDrag({
        subIndex,
        nodeIndex,
        kind,
        startClient: { x: e.clientX, y: e.clientY },
        startPoint: { ...start }
      })
    },
    [data]
  )

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const dxPx = (e.clientX - drag.startClient.x) / scale
      const dyPx = (e.clientY - drag.startClient.y) / scale
      const dxNorm = dxPx / Math.max(1, width)
      const dyNorm = dyPx / Math.max(1, height)
      setData(prev => {
        const next = clonePathData(prev)
        const node = next.subpaths[drag.subIndex]?.nodes[drag.nodeIndex]
        if (!node) return prev
        const target: Point = {
          x: drag.startPoint.x + dxNorm,
          y: drag.startPoint.y + dyNorm
        }
        if (drag.kind === 'anchor') {
          const dx = target.x - node.point.x
          const dy = target.y - node.point.y
          node.point = target
          if (node.in) node.in = { x: node.in.x + dx, y: node.in.y + dy }
          if (node.out) node.out = { x: node.out.x + dx, y: node.out.y + dy }
        } else if (drag.kind === 'in') {
          node.in = target
          if (node.smooth && node.out) {
            // Mirror the opposite handle across the anchor to preserve smoothness.
            node.out = { x: 2 * node.point.x - target.x, y: 2 * node.point.y - target.y }
          }
        } else {
          node.out = target
          if (node.smooth && node.in) {
            node.in = { x: 2 * node.point.x - target.x, y: 2 * node.point.y - target.y }
          }
        }
        return next
      })
    }
    const onUp = () => {
      setDrag(null)
      // Commit the final snapshot to the parent so undo/redo records one step.
      setData(curr => {
        onChangePath(nodesToCustomPath(curr))
        return curr
      })
    }
    globalThis.addEventListener('mousemove', onMove)
    globalThis.addEventListener('mouseup', onUp)
    return () => {
      globalThis.removeEventListener('mousemove', onMove)
      globalThis.removeEventListener('mouseup', onUp)
    }
  }, [drag, scale, width, height, onChangePath])

  // Hotkeys: Esc exits, Delete removes the selected anchor, A toggles smooth,
  // C toggles curve on the incoming segment.
  const [selected, setSelected] = useState<{ sub: number; node: number } | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
        return
      }
      if (!selected) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        setData(prev => {
          const next = clonePathData(prev)
          const sub = next.subpaths[selected.sub]
          if (!sub || sub.nodes.length <= 2) return prev
          sub.nodes.splice(selected.node, 1)
          onChangePath(nodesToCustomPath(next))
          return next
        })
        setSelected(null)
        return
      }
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        setData(prev => {
          const next = clonePathData(prev)
          const node = next.subpaths[selected.sub]?.nodes[selected.node]
          if (!node) return prev
          node.smooth = !node.smooth
          onChangePath(nodesToCustomPath(next))
          return next
        })
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setData(prev => {
          const next = clonePathData(prev)
          const node = next.subpaths[selected.sub]?.nodes[selected.node]
          if (!node) return prev
          if (node.in || node.out) {
            node.in = undefined
            node.out = undefined
          } else {
            // Seed curved handles as a short tangent line through the anchor.
            const dx = 0.08
            node.in = { x: node.point.x - dx, y: node.point.y }
            node.out = { x: node.point.x + dx, y: node.point.y }
            node.smooth = true
          }
          onChangePath(nodesToCustomPath(next))
          return next
        })
      }
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [selected, onExit, onChangePath])

  // Insert anchor with Alt+click on a segment.
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!e.altKey) return
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      // Insert before the closest segment end-point.
      setData(prev => {
        const next = clonePathData(prev)
        const sub = next.subpaths[0]
        if (!sub) return prev
        let bestI = 1
        let bestD = Infinity
        for (let i = 1; i <= sub.nodes.length; i++) {
          const a = sub.nodes[i - 1].point
          const b = sub.nodes[i % sub.nodes.length].point
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          const d = (mx - x) ** 2 + (my - y) ** 2
          if (d < bestD) {
            bestD = d
            bestI = i
          }
        }
        const node: PathNode = {
          kind: 'anchor',
          point: { x, y },
          smooth: false
        }
        sub.nodes.splice(bestI % sub.nodes.length, 0, node)
        onChangePath(nodesToCustomPath(next))
        return next
      })
    },
    [onChangePath]
  )

  const pathD = useMemo(() => nodesToCustomPath(data), [data])

  return (
    <div
      data-testid={testId ?? `shape-point-editor-${element.id}`}
      data-shape-point-editor="true"
      role="application"
      aria-label="Shape point editor"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
        zIndex: 10,
        cursor: 'default'
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onExit()
        }
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
        onMouseDown={handleOverlayMouseDown}
      >
        <path
          d={scaledPathD(pathD, width, height)}
          fill="none"
          stroke="var(--nw-primary)"
          strokeWidth={1}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
        {data.subpaths.map((sub, si) =>
          sub.nodes.map((node, ni) => {
            const isSelected = selected?.sub === si && selected.node === ni
            const ax = node.point.x * width
            const ay = node.point.y * height
            const handles: React.ReactNode[] = []
            if (node.in) {
              const hx = node.in.x * width
              const hy = node.in.y * height
              handles.push(
                <React.Fragment key={`in-${si}-${ni}`}>
                  <line x1={ax} y1={ay} x2={hx} y2={hy} stroke="var(--nw-border)" strokeWidth={1} />
                  <circle
                    cx={hx}
                    cy={hy}
                    r={CONTROL_RADIUS}
                    fill="var(--nw-background)"
                    stroke="var(--nw-primary)"
                    strokeWidth={1}
                    style={{ cursor: 'grab' }}
                    onMouseDown={e => startDrag(e, si, ni, 'in')}
                  />
                </React.Fragment>
              )
            }
            if (node.out) {
              const hx = node.out.x * width
              const hy = node.out.y * height
              handles.push(
                <React.Fragment key={`out-${si}-${ni}`}>
                  <line x1={ax} y1={ay} x2={hx} y2={hy} stroke="var(--nw-border)" strokeWidth={1} />
                  <circle
                    cx={hx}
                    cy={hy}
                    r={CONTROL_RADIUS}
                    fill="var(--nw-background)"
                    stroke="var(--nw-primary)"
                    strokeWidth={1}
                    style={{ cursor: 'grab' }}
                    onMouseDown={e => startDrag(e, si, ni, 'out')}
                  />
                </React.Fragment>
              )
            }
            return (
              <React.Fragment key={`a-${si}-${ni}`}>
                {handles}
                <rect
                  x={ax - HANDLE_RADIUS}
                  y={ay - HANDLE_RADIUS}
                  width={HANDLE_RADIUS * 2}
                  height={HANDLE_RADIUS * 2}
                  fill={isSelected ? 'var(--nw-primary)' : 'var(--nw-background)'}
                  stroke="var(--nw-primary)"
                  strokeWidth={1.5}
                  style={{ cursor: 'grab' }}
                  data-testid={`${testId ?? 'shape-point-editor'}-anchor-${si}-${ni}`}
                  onMouseDown={e => {
                    setSelected({ sub: si, node: ni })
                    startDrag(e, si, ni, 'anchor')
                  }}
                />
              </React.Fragment>
            )
          })
        )}
      </svg>
    </div>
  )
}

/**
 * Rescale a unit-box path string so SVG viewBox uses pixel coords; avoids
 * the need to use an extra `<g transform>` wrapper (keeps hit-testing and
 * stroke widths predictable).
 */
function scaledPathD(d: string, w: number, h: number): string {
  return d.replace(/(-?\d+\.?\d*(?:[eE][-+]?\d+)?)\s+(-?\d+\.?\d*(?:[eE][-+]?\d+)?)/g, (_, x: string, y: string) => {
    const nx = Number.parseFloat(x) * w
    const ny = Number.parseFloat(y) * h
    return `${nx} ${ny}`
  })
}
