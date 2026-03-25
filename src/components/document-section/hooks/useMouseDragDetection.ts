import React from 'react'
import { DRAG_THRESHOLD_PIXELS, DRAG_RESET_DELAY_MS } from '../constants'

interface UseMouseDragDetectionProps {
  mouseDownPos: { x: number; y: number } | null
  setMouseDownPos: (pos: { x: number; y: number } | null) => void
  setIsDragging: (dragging: boolean) => void
}

/**
 * Hook to detect mouse drag vs click
 * Tracks mouse movement to distinguish between clicks and drag operations
 */
export function useMouseDragDetection({ mouseDownPos, setMouseDownPos, setIsDragging }: UseMouseDragDetectionProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseDownPos) {
      const distance = Math.sqrt(Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2))

      // If mouse moved more than threshold, consider it a drag
      if (distance > DRAG_THRESHOLD_PIXELS) {
        setIsDragging(true)
      }
    }
  }

  const handleMouseUp = () => {
    setMouseDownPos(null)
    // Reset dragging state after a short delay to allow click to process
    setTimeout(() => setIsDragging(false), DRAG_RESET_DELAY_MS)
  }

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  }
}
