import { useState, useCallback, useRef } from 'react'

interface UseResizablePanelOptions {
  defaultWidth?: number
  minWidth?: number
  maxWidthRatio?: number
}

interface UseResizablePanelReturn {
  panelWidth: number
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement>
  handleMouseDown: (e: React.MouseEvent) => void
}

export const useResizablePanel = ({
  defaultWidth = 420,
  minWidth = 320,
  maxWidthRatio = 0.5
}: UseResizablePanelOptions = {}): UseResizablePanelReturn => {
  const [panelWidth, setPanelWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)

      const startX = e.clientX
      const startWidth = panelWidth

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
        const maxWidth = containerWidth * maxWidthRatio
        const delta = moveEvent.clientX - startX
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta))
        setPanelWidth(newWidth)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [panelWidth, minWidth, maxWidthRatio]
  )

  return { panelWidth, isDragging, containerRef, handleMouseDown }
}
