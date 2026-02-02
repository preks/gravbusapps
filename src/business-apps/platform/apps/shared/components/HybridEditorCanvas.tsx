/**
 * HybridEditorCanvas Component
 * Captures Apple Pencil input and overlays on the editor
 *
 * This component detects stylus input and captures strokes,
 * allowing handwritten annotations on top of the text editor.
 */

import React, { useRef, useEffect, useCallback } from 'react'
import type { StrokeData, StrokePoint } from '../types/strokes'

export interface HybridEditorCanvasProps {
  editorRef: React.RefObject<HTMLDivElement>
  onStrokeComplete?: (stroke: StrokeData) => void
  disabled?: boolean
  className?: string
}

/**
 * Check if the event is from a stylus (Apple Pencil, etc.)
 */
function isStylusEvent(e: PointerEvent): boolean {
  return e.pointerType === 'pen'
}

export const HybridEditorCanvas: React.FC<HybridEditorCanvasProps> = ({
  editorRef,
  onStrokeComplete,
  disabled = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentStrokeRef = useRef<StrokePoint[]>([])
  const isDrawingRef = useRef(false)

  // Get canvas context
  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  // Resize canvas to match editor
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const editor = editorRef.current
      if (!canvas || !editor) return

      const rect = editor.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [editorRef])

  const finishStroke = useCallback(() => {
    if (!isDrawingRef.current || disabled) return

    isDrawingRef.current = false

    if (currentStrokeRef.current.length > 0 && onStrokeComplete) {
      const stroke: StrokeData = {
        points: currentStrokeRef.current,
        color: '#000000',
        width: 2,
        timestamp: Date.now()
      }
      onStrokeComplete(stroke)
    }

    currentStrokeRef.current = []
  }, [disabled, onStrokeComplete])

  // IMPORTANT: canvas must NOT block mouse/touch clicks for typing.
  // We listen on the editor container in capture mode to intercept *pen* events only.
  useEffect(() => {
    const editorEl = editorRef.current
    if (!editorEl || disabled) return

    const onPointerDown = (e: PointerEvent) => {
      if (!isStylusEvent(e)) return
      const canvas = canvasRef.current
      if (!canvas) return

      e.preventDefault()
      e.stopPropagation()

      isDrawingRef.current = true
      currentStrokeRef.current = []

      const rect = canvas.getBoundingClientRect()
      const point: StrokePoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: (e as any).pressure || 0.5
      }
      currentStrokeRef.current.push(point)

      const ctx = getContext()
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || disabled) return
      if (!isStylusEvent(e)) return

      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const point: StrokePoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: (e as any).pressure || 0.5
      }
      currentStrokeRef.current.push(point)

      const ctx = getContext()
      if (ctx) {
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isStylusEvent(e)) return
      finishStroke()
    }

    // Capture so we can prevent default for pen without affecting mouse.
    editorEl.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp, { passive: false })
    window.addEventListener('pointercancel', onPointerUp, { passive: false })

    return () => {
      editorEl.removeEventListener('pointerdown', onPointerDown, true as any)
      window.removeEventListener('pointermove', onPointerMove as any)
      window.removeEventListener('pointerup', onPointerUp as any)
      window.removeEventListener('pointercancel', onPointerUp as any)
    }
  }, [disabled, editorRef, finishStroke, getContext])

  if (disabled) return null

  return (
    <canvas
      ref={canvasRef}
      className={`gba:absolute gba:inset-0 gba:pointer-events-none gba:touch-none ${className}`}
      style={{
        touchAction: 'none',
        // Let typing clicks pass through; pen input is captured via listeners above.
        pointerEvents: 'none'
      }}
    />
  )
}

export default HybridEditorCanvas
