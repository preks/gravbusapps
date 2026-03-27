/**
 * SignatureCanvas – drawn signature capture using perfect-freehand.
 * Reuses stroke-to-SVG logic from HandwritingCanvas; supports mouse and touch.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { getStroke } from 'perfect-freehand'
import { Button, useTranslation } from '@newwork/nw-design-system'
import type { StrokeData, StrokePoint } from '@/business-apps/platform/apps/shared/types/strokes'
import translations from '../../_i18n'

const STROKE_OPTIONS = {
  size: 8,
  thinning: 0.4,
  smoothing: 0.6,
  streamline: 0.6,
  easing: (t: number) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true }
}

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

export function strokesToSvg(strokes: StrokeData[], width: number, height: number, penColor = '#000000'): string {
  const paths = strokes
    .filter(s => s.points.length >= 2)
    .map(stroke => {
      const strokePoints = stroke.points.map(p => [p.x, p.y, p.pressure ?? 0.5] as [number, number, number])
      const outlinePoints = getStroke(strokePoints, {
        ...STROKE_OPTIONS,
        size: (stroke.width ?? 4) * 2
      })
      if (outlinePoints.length < 2) return ''
      const d = getSvgPathFromStroke(outlinePoints)
      const color = stroke.color ?? penColor
      return `<path d="${d}" fill="${color}" stroke="none"/>`
    })
    .filter(Boolean)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${paths.join('')}</svg>`
}

export type SignatureCanvasInputMode = 'direct' | 'trackpad'

export interface SignatureCanvasProps {
  width: number
  height: number
  penColor?: string
  penWidth?: number
  /** Direct: pointer on canvas maps 1:1. Trackpad: pad area maps proportionally to canvas. */
  inputMode?: SignatureCanvasInputMode
  /** Required when inputMode === 'trackpad': the element used as the signing pad (e.g. Handwritten tab wrapper). */
  padRef?: React.RefObject<HTMLElement | null>
  /** When true, trackpad pointer listeners are active; when false they are removed and any current stroke is committed. */
  isTrackpadActive?: boolean
  onStrokesChange?: (strokes: StrokeData[]) => void
  /** Applied on mount (use with a remounting `key` when loading strokes for edit). */
  initialStrokes?: StrokeData[]
  'data-testid'?: string
}

export function SignatureCanvas({
  width,
  height,
  penColor = '#000000',
  penWidth = 4,
  inputMode = 'direct',
  padRef,
  isTrackpadActive = false,
  onStrokesChange,
  initialStrokes,
  'data-testid': testId = 'signature-canvas'
}: Readonly<SignatureCanvasProps>) {
  const { t } = useTranslation(translations)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<StrokeData[]>(() => initialStrokes ?? [])
  const [redoStack, setRedoStack] = useState<StrokeData[]>([])
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<StrokePoint[]>([])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return
      const strokePoints = stroke.points.map(p => [p.x, p.y, p.pressure ?? 0.5])
      const outlinePoints = getStroke(strokePoints, {
        ...STROKE_OPTIONS,
        size: (stroke.width ?? penWidth) * 2
      })
      if (outlinePoints.length < 2) return
      ctx.beginPath()
      ctx.fillStyle = stroke.color ?? penColor
      ctx.fill(new Path2D(getSvgPathFromStroke(outlinePoints)))
    })
    if (currentStrokeRef.current.length > 1) {
      const strokePoints = currentStrokeRef.current.map(p => [p.x, p.y, p.pressure ?? 0.5])
      const outlinePoints = getStroke(strokePoints, { ...STROKE_OPTIONS, size: penWidth * 2 })
      if (outlinePoints.length >= 2) {
        ctx.beginPath()
        ctx.fillStyle = penColor
        ctx.fill(new Path2D(getSvgPathFromStroke(outlinePoints)))
      }
    }
  }, [strokes, penColor, penWidth])

  useEffect(() => {
    requestAnimationFrame(redraw)
  }, [redraw])

  useEffect(() => {
    onStrokesChange?.(strokes)
  }, [strokes, onStrokesChange])

  // Indirect-pad mode: single PointerEvent model; pointer capture so strokes continue outside pad; fresh bounds each map
  useEffect(() => {
    if (inputMode !== 'trackpad' || !padRef?.current || !isTrackpadActive) return
    const pad = padRef.current

    const clientToCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = pad.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 }
      const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      return { x: nx * width, y: ny * height }
    }

    const commitCurrentStroke = () => {
      if (currentStrokeRef.current.length > 1) {
        const newStroke: StrokeData = {
          points: [...currentStrokeRef.current],
          color: penColor,
          width: penWidth,
          timestamp: Date.now()
        }
        setStrokes(prev => [...prev, newStroke])
        setRedoStack([])
      }
      currentStrokeRef.current = []
      isDrawingRef.current = false
    }

    const isInteractive = (el: HTMLElement | null) =>
      el &&
      (el.tagName === 'BUTTON' ||
        el.tagName === 'INPUT' ||
        el.tagName === 'SELECT' ||
        el.closest('button, input, select, label'))

    const onDown = (e: PointerEvent) => {
      if (isInteractive(e.target as HTMLElement)) return
      if (e.pointerType === 'mouse' && e.buttons === 0) return
      e.preventDefault()
      const { x, y } = clientToCanvas(e.clientX, e.clientY)
      isDrawingRef.current = true
      currentStrokeRef.current = [{ x, y, pressure: e.pressure || 0.5 }]
      try {
        pad.setPointerCapture(e.pointerId)
      } catch {
        // ignore if capture not supported
      }
      redraw()
    }

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      if (isInteractive(e.target as HTMLElement)) {
        commitCurrentStroke()
        return
      }
      const { x, y } = clientToCanvas(e.clientX, e.clientY)
      currentStrokeRef.current.push({ x, y, pressure: e.pressure || 0.5 })
      redraw()
    }

    const onUp = (e: PointerEvent) => {
      try {
        pad.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      if (isDrawingRef.current) commitCurrentStroke()
    }

    const onLeave = () => {
      if (isDrawingRef.current) commitCurrentStroke()
    }

    pad.addEventListener('pointerdown', onDown, { capture: false })
    pad.addEventListener('pointermove', onMove, { capture: false })
    pad.addEventListener('pointerup', onUp, { capture: false })
    pad.addEventListener('pointerleave', onLeave, { capture: false })
    pad.addEventListener('pointercancel', onUp, { capture: false })
    const prevTouchAction = pad.style.touchAction
    pad.style.touchAction = 'none'
    const prevCursor = pad.style.cursor
    pad.style.cursor = 'crosshair'

    return () => {
      pad.removeEventListener('pointerdown', onDown, { capture: false })
      pad.removeEventListener('pointermove', onMove, { capture: false })
      pad.removeEventListener('pointerup', onUp, { capture: false })
      pad.removeEventListener('pointerleave', onLeave, { capture: false })
      pad.removeEventListener('pointercancel', onUp, { capture: false })
      pad.style.touchAction = prevTouchAction
      pad.style.cursor = prevCursor
      if (isDrawingRef.current) commitCurrentStroke()
    }
  }, [inputMode, padRef, width, height, redraw, penColor, penWidth, isTrackpadActive])

  const isDirectMode = inputMode === 'direct'

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    isDrawingRef.current = true
    currentStrokeRef.current = [
      {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5
      }
    ]
    canvas.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      e.stopPropagation()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      currentStrokeRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5
      })
      redraw()
    },
    [redraw]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      canvasRef.current?.releasePointerCapture(e.pointerId)
      isDrawingRef.current = false
      if (currentStrokeRef.current.length > 1) {
        const newStroke: StrokeData = {
          points: [...currentStrokeRef.current],
          color: penColor,
          width: penWidth,
          timestamp: Date.now()
        }
        setStrokes(prev => [...prev, newStroke])
        setRedoStack([])
      }
      currentStrokeRef.current = []
    },
    [strokes, penColor, penWidth]
  )

  const handleClear = useCallback(() => {
    setStrokes([])
    setRedoStack([])
    currentStrokeRef.current = []
    requestAnimationFrame(redraw)
  }, [redraw])

  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    setStrokes(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, last])
  }, [strokes])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const stroke = redoStack[redoStack.length - 1]
    setStrokes(prev => [...prev, stroke])
    setRedoStack(prev => prev.slice(0, -1))
  }, [redoStack])

  return (
    <div
      className="gba:space-y-2"
      data-testid={testId}
      style={inputMode === 'trackpad' ? { pointerEvents: 'none' } : undefined}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="gba:block gba:w-full gba:border gba:border-input gba:rounded-md gba:bg-background gba:cursor-crosshair"
        style={{
          touchAction: isDirectMode ? 'none' : 'auto',
          pointerEvents: isDirectMode ? 'auto' : 'none'
        }}
        onPointerDown={isDirectMode ? handlePointerDown : undefined}
        onPointerMove={isDirectMode ? handlePointerMove : undefined}
        onPointerUp={isDirectMode ? handlePointerUp : undefined}
        onPointerCancel={
          isDirectMode
            ? () => {
                isDrawingRef.current = false
                currentStrokeRef.current = []
              }
            : undefined
        }
        onContextMenu={e => e.preventDefault()}
        data-testid={`${testId}-pad`}
      />
      <div className="gba:flex gba:gap-2" style={inputMode === 'trackpad' ? { pointerEvents: 'auto' } : undefined}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={strokes.length === 0}
          data-testid={`${testId}-undo`}
        >
          {t('signature-canvas-undo')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          data-testid={`${testId}-redo`}
        >
          {t('signature-canvas-redo')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleClear} data-testid={`${testId}-clear`}>
          {t('signature-canvas-clear')}
        </Button>
      </div>
    </div>
  )
}
