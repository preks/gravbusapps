import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'boards-sidebar-width'
const DEFAULT_WIDTH = 260
const MIN_WIDTH = 200
const MAX_WIDTH = 400

export interface UseResizableSidebarReturn {
  width: number
  isResizing: boolean
  isCollapsed: boolean
  handleMouseDown: (e: React.MouseEvent) => void
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
}

function loadPersistedWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = Number(saved)
      if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH
}

export function useResizableSidebar(): UseResizableSidebarReturn {
  const [width, setWidth] = useState(loadPersistedWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX
      startWidthRef.current = width
      setIsResizing(true)
    },
    [width]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta))
      setWidth(next)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      try {
        localStorage.setItem(STORAGE_KEY, String(width))
      } catch {
        // ignore
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, width])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  return {
    width,
    isResizing,
    isCollapsed,
    handleMouseDown,
    toggleCollapsed,
    setCollapsed: setIsCollapsed
  }
}
