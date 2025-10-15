import React, { useState, useCallback, useRef, useEffect } from 'react'

interface ResizeHandleProps {
  onResize: (deltaColumns: number) => void
  disabled?: boolean
  position: 'left' | 'right'
  prefixDataTestId?: string
  columnWidth?: number
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onResize,
  disabled,
  position,
  prefixDataTestId = 'resize-handle',
  columnWidth = 100
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const onResizeRef = useRef(onResize)
  const positionRef = useRef(position)
  const columnWidthRef = useRef(columnWidth)

  // Keep refs up to date with latest props
  useEffect(() => {
    onResizeRef.current = onResize
  }, [onResize])

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    columnWidthRef.current = columnWidth
  }, [columnWidth])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      let lastReportedDelta = 0

      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      setIsDragging(true)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const effectiveColumnWidth = columnWidthRef.current || 100
        let deltaColumns = Math.round(deltaX / effectiveColumnWidth)

        // Adjust direction based on handle position
        if (positionRef.current === 'left') {
          deltaColumns = -deltaColumns // Invert for left handle
        }

        // Only trigger if delta changed
        if (deltaColumns !== lastReportedDelta) {
          lastReportedDelta = deltaColumns
          onResizeRef.current(deltaColumns)
        }
      }

      const handleMouseUp = () => {
        cleanup()
      }

      const cleanup = () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setIsDragging(false)

        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        cleanupRef.current = null
      }

      // Store cleanup function for unmount scenario
      cleanupRef.current = cleanup

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled]
  )

  const positionClass = position === 'left' ? 'gba:left-0 gba:-ml-2' : 'gba:right-0 gba:-mr-2'

  return (
    <div
      className={`gba:absolute gba:top-0 gba:bottom-0 gba:w-4 ${positionClass} gba:cursor-ew-resize gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:z-20`}
      onMouseDown={handleMouseDown}
      data-testid={`${prefixDataTestId}-${position}`}
      title={`Resize by dragging ${position}`}
    >
      <div
        className={`gba:h-full gba:w-full gba:rounded-sm ${
          isDragging ? 'gba:bg-primary' : 'gba:bg-primary/40 hover:gba:bg-primary/70'
        } gba:transition-all`}
      />
    </div>
  )
}

export default ResizeHandle
