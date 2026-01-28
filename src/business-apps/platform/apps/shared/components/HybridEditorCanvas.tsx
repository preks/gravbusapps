/**
 * HybridEditorCanvas Component
 * Captures Apple Pencil input and overlays on the editor
 *
 * This component detects stylus input and captures strokes,
 * allowing handwritten annotations on top of the text editor.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
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
  const [isDrawing, setIsDrawing] = useState(false)
  const currentStrokeRef = useRef<StrokePoint[]>([])

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

  // Handle pointer events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !isStylusEvent(e.nativeEvent)) return

      e.preventDefault()
      setIsDrawing(true)
      currentStrokeRef.current = []

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const point: StrokePoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5
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
    },
    [disabled, getContext]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || disabled || !isStylusEvent(e.nativeEvent)) return

      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const point: StrokePoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5
      }
      currentStrokeRef.current.push(point)

      const ctx = getContext()
      if (ctx) {
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
      }
    },
    [isDrawing, disabled, getContext]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || disabled) return

    setIsDrawing(false)

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
  }, [isDrawing, disabled, onStrokeComplete])

  if (disabled) return null

  return (
    <canvas
      ref={canvasRef}
      className={`gba:absolute gba:inset-0 gba:pointer-events-auto gba:touch-none ${className}`}
      style={{
        touchAction: 'none',
        // Only capture stylus events, let mouse/touch pass through
        pointerEvents: 'auto'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
}

export default HybridEditorCanvas
