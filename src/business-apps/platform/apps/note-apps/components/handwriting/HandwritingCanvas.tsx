/**
 * HandwritingCanvas Component
 * Provides drawing functionality using HTML5 Canvas and perfect-freehand
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import type { StrokeData, StrokePoint } from './index'

interface HandwritingCanvasProps {
  width: number
  height: number
  penColor: string
  penWidth: number
  initialStrokes?: StrokeData[]
  onStrokeComplete?: (stroke: StrokeData) => void
  onStrokesChange?: (strokes: StrokeData[]) => void
  scrollContainerRef?: React.RefObject<HTMLDivElement>
}

// Stroke rendering options for smooth, high-quality output
const STROKE_OPTIONS = {
  size: 8,
  thinning: 0.4,
  smoothing: 0.6,
  streamline: 0.6,
  easing: (t: number) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true }
}

// Check if input is from Apple Pencil
const isPencil = (e: PointerEvent | React.PointerEvent): boolean => {
  return e.pointerType === 'pen'
}

// Convert stroke points to SVG path
function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length < 2) return ''

  const d: string[] = []
  let [p0, p1] = stroke

  d.push(`M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`)

  for (let i = 1; i < stroke.length; i++) {
    const midPoint = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
    d.push(`Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${midPoint[0].toFixed(2)} ${midPoint[1].toFixed(2)}`)
    p0 = p1
    p1 = stroke[i]
  }

  d.push(`L ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`)

  return d.join(' ')
}

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  width,
  height,
  penColor,
  penWidth,
  initialStrokes = [],
  onStrokeComplete,
  onStrokesChange,
  scrollContainerRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<StrokeData[]>(initialStrokes)

  // Refs for drawing state (avoid re-renders during active drawing)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<StrokePoint[]>([])
  const lastScrollYRef = useRef(0)

  // Redraw all strokes on the canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all completed strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return

      const strokePoints = stroke.points.map(p => [p.x, p.y, p.pressure || 0.5])
      const outlinePoints = getStroke(strokePoints, {
        ...STROKE_OPTIONS,
        size: stroke.width * 2
      })

      if (outlinePoints.length < 2) return

      ctx.beginPath()
      ctx.fillStyle = stroke.color

      const path = new Path2D(getSvgPathFromStroke(outlinePoints))
      ctx.fill(path)
    })

    // Draw current stroke if drawing
    if (currentStrokeRef.current.length > 1) {
      const strokePoints = currentStrokeRef.current.map(p => [p.x, p.y, p.pressure || 0.5])
      const outlinePoints = getStroke(strokePoints, {
        ...STROKE_OPTIONS,
        size: penWidth * 2
      })

      if (outlinePoints.length >= 2) {
        ctx.beginPath()
        ctx.fillStyle = penColor

        const path = new Path2D(getSvgPathFromStroke(outlinePoints))
        ctx.fill(path)
      }
    }
  }, [strokes, penColor, penWidth])

  // Redraw when strokes change
  useEffect(() => {
    requestAnimationFrame(redraw)
  }, [redraw])

  // Load initial strokes
  useEffect(() => {
    if (initialStrokes.length > 0 && strokes.length === 0) {
      setStrokes(initialStrokes)
      requestAnimationFrame(redraw)
    }
  }, [initialStrokes, strokes.length, redraw])

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Only draw with pencil
      if (!isPencil(e.nativeEvent)) {
        // Finger - allow scrolling
        lastScrollYRef.current = e.clientY
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scrollTop = scrollContainerRef?.current?.scrollTop || 0

      isDrawingRef.current = true
      currentStrokeRef.current = [
        {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top + scrollTop,
          pressure: e.pressure || 0.5
        }
      ]

      canvas.setPointerCapture(e.pointerId)
    },
    [scrollContainerRef]
  )

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Handle finger scrolling
      if (!isPencil(e.nativeEvent) && !isDrawingRef.current) {
        if (e.buttons > 0 && scrollContainerRef?.current) {
          const deltaY = lastScrollYRef.current - e.clientY
          scrollContainerRef.current.scrollTop += deltaY
          lastScrollYRef.current = e.clientY
        }
        return
      }

      if (!isDrawingRef.current) return

      e.preventDefault()
      e.stopPropagation()

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scrollTop = scrollContainerRef?.current?.scrollTop || 0

      currentStrokeRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top + scrollTop,
        pressure: e.pressure || 0.5
      })

      redraw()
    },
    [scrollContainerRef, redraw]
  )

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return

      e.preventDefault()

      const canvas = canvasRef.current
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId)
      }

      isDrawingRef.current = false

      if (currentStrokeRef.current.length > 1) {
        const newStroke: StrokeData = {
          points: [...currentStrokeRef.current],
          color: penColor,
          width: penWidth,
          timestamp: Date.now()
        }

        const newStrokes = [...strokes, newStroke]
        setStrokes(newStrokes)
        onStrokeComplete?.(newStroke)
        onStrokesChange?.(newStrokes)
      }

      currentStrokeRef.current = []
    },
    [strokes, penColor, penWidth, onStrokeComplete, onStrokesChange]
  )

  // Handle pointer cancel
  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false
    currentStrokeRef.current = []
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="gba:absolute gba:top-0 gba:left-0"
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onSelectStart={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    />
  )
}
