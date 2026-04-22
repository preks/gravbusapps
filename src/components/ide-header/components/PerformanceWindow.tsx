import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@newwork/nw-design-system'
import { ChartBarIcon, DotsSixVerticalIcon, XIcon } from '@phosphor-icons/react'
import { PerformanceContent } from './PerformanceContent'
import { resetScreenPerformanceMetrics } from '@/common/hooks/useScreenPerformanceMetrics'

const WINDOW_DEFAULT_WIDTH_PX = 560
const WINDOW_DEFAULT_HEIGHT_PX = 640
const WINDOW_VIEWPORT_MARGIN_PX = 16
const WINDOW_INITIAL_TOP_PX = 72
const WINDOW_INITIAL_RIGHT_OFFSET_PX = 24
const PERFORMANCE_WINDOW_POSITION_STORAGE_KEY = 'gba:performance-window-position'

interface WindowPosition {
  x: number
  y: number
}

interface DragOffset {
  x: number
  y: number
}

export interface PerformanceWindowProps {
  open: boolean
  onClose: () => void
}

function readPersistedWindowPosition(): WindowPosition | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const persistedPositionJson = window.sessionStorage.getItem(PERFORMANCE_WINDOW_POSITION_STORAGE_KEY)
    if (!persistedPositionJson) {
      return null
    }

    const persistedPosition = JSON.parse(persistedPositionJson) as Partial<WindowPosition>
    if (
      typeof persistedPosition.x !== 'number' ||
      !Number.isFinite(persistedPosition.x) ||
      typeof persistedPosition.y !== 'number' ||
      !Number.isFinite(persistedPosition.y)
    ) {
      return null
    }

    return {
      x: persistedPosition.x,
      y: persistedPosition.y
    }
  } catch {
    return null
  }
}

function getInitialWindowPosition(): WindowPosition {
  if (typeof window === 'undefined') {
    return { x: WINDOW_VIEWPORT_MARGIN_PX, y: WINDOW_INITIAL_TOP_PX }
  }

  const persistedWindowPosition = readPersistedWindowPosition()
  if (persistedWindowPosition) {
    return clampWindowPosition(persistedWindowPosition, WINDOW_DEFAULT_WIDTH_PX, WINDOW_DEFAULT_HEIGHT_PX)
  }

  return {
    x: Math.max(
      WINDOW_VIEWPORT_MARGIN_PX,
      window.innerWidth - WINDOW_DEFAULT_WIDTH_PX - WINDOW_INITIAL_RIGHT_OFFSET_PX
    ),
    y: WINDOW_INITIAL_TOP_PX
  }
}

function clampWindowPosition(position: WindowPosition, width: number, height: number): WindowPosition {
  if (typeof window === 'undefined') {
    return position
  }

  return {
    x: Math.min(
      Math.max(WINDOW_VIEWPORT_MARGIN_PX, position.x),
      Math.max(WINDOW_VIEWPORT_MARGIN_PX, window.innerWidth - width - WINDOW_VIEWPORT_MARGIN_PX)
    ),
    y: Math.min(
      Math.max(WINDOW_VIEWPORT_MARGIN_PX, position.y),
      Math.max(WINDOW_VIEWPORT_MARGIN_PX, window.innerHeight - height - WINDOW_VIEWPORT_MARGIN_PX)
    )
  }
}

export const PerformanceWindow: React.FC<PerformanceWindowProps> = ({ open, onClose }) => {
  const windowRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef<DragOffset | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [windowPosition, setWindowPosition] = useState<WindowPosition>(() => getInitialWindowPosition())

  const getWindowSize = useCallback(() => {
    const windowRect = windowRef.current?.getBoundingClientRect()
    return {
      width: windowRect?.width ?? WINDOW_DEFAULT_WIDTH_PX,
      height: windowRect?.height ?? WINDOW_DEFAULT_HEIGHT_PX
    }
  }, [])

  const handleResetMetrics = useCallback(() => {
    resetScreenPerformanceMetrics()
  }, [])

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted || typeof window === 'undefined') {
      return
    }

    try {
      window.sessionStorage.setItem(PERFORMANCE_WINDOW_POSITION_STORAGE_KEY, JSON.stringify(windowPosition))
    } catch {
      // Ignore storage errors to keep the profiler passive.
    }
  }, [hasMounted, windowPosition])

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handleResize = () => {
      const { width, height } = getWindowSize()
      setWindowPosition(currentPosition => clampWindowPosition(currentPosition, width, height))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [getWindowSize, onClose, open])

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragOffsetRef.current) {
        return
      }

      const { width, height } = getWindowSize()
      const nextPosition = clampWindowPosition(
        {
          x: event.clientX - dragOffsetRef.current.x,
          y: event.clientY - dragOffsetRef.current.y
        },
        width,
        height
      )

      setWindowPosition(nextPosition)
    }

    const handlePointerUp = () => {
      dragOffsetRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [getWindowSize, open])

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    const windowRect = windowRef.current?.getBoundingClientRect()
    if (!windowRect) {
      return
    }

    dragOffsetRef.current = {
      x: event.clientX - windowRect.left,
      y: event.clientY - windowRect.top
    }
    setIsDragging(true)
    event.preventDefault()
  }

  if (!hasMounted || !open) {
    return null
  }

  return createPortal(
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="performance-window-title"
      className="gba:fixed gba:z-[120] gba:w-[560px] gba:max-w-[calc(100vw-32px)] gba:max-h-[calc(100vh-32px)] gba:bg-background gba:border gba:border-border gba:rounded-xl gba:shadow-2xl gba:flex gba:flex-col gba:overflow-hidden"
      style={{
        left: windowPosition.x,
        top: windowPosition.y
      }}
      data-testid="PerformanceWindow"
    >
      <div
        className={`gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:bg-muted/60 gba:select-none ${
          isDragging ? 'gba:cursor-grabbing' : 'gba:cursor-grab'
        }`}
        onPointerDown={handleDragStart}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <DotsSixVerticalIcon size={18} className="gba:text-muted-foreground gba:shrink-0" aria-hidden="true" />
          <ChartBarIcon size={18} className="gba:text-foreground gba:shrink-0" aria-hidden="true" />
          <div className="gba:min-w-0">
            <h3 id="performance-window-title" className="gba:text-sm gba:font-semibold">
              Performance Analysis
            </h3>
            <div className="gba:text-[10px] gba:text-muted-foreground">Sticky runtime profiler window</div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetMetrics}
            onPointerDown={event => event.stopPropagation()}
            data-testid="PerformanceWindow-Reset"
          >
            Reset Data
          </Button>

          <Button
            variant="ghost"
            size="iconSm"
            onClick={onClose}
            onPointerDown={event => event.stopPropagation()}
            aria-label="Close performance window"
            className="gba:shrink-0"
            data-testid="PerformanceWindow-Close"
          >
            <XIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:p-4">
        <PerformanceContent />
      </div>
    </div>,
    document.body
  )
}
