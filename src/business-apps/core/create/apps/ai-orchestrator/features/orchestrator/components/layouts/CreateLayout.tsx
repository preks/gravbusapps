/**
 * CreateLayout - Resizable two-panel layout for the agent chat + canvas.
 * Adapted from NexusLayout with simplified logic (no sidebar toggle).
 * Chat panel is always visible when active.
 */

import { useState, useCallback, useRef } from 'react'

const MIN_CHAT_WIDTH = 320
const MAX_CHAT_WIDTH_RATIO = 0.5
const DEFAULT_CHAT_WIDTH = 420

interface CreateLayoutProps {
  chatPanel: React.ReactNode
  canvasPanel: React.ReactNode
  testId?: string
}

export const CreateLayout = ({ chatPanel, canvasPanel, testId = 'create-orchestrator' }: CreateLayoutProps) => {
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)

      const startX = e.clientX
      const startWidth = chatWidth

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
        const maxWidth = containerWidth * MAX_CHAT_WIDTH_RATIO
        const delta = moveEvent.clientX - startX
        const newWidth = Math.max(MIN_CHAT_WIDTH, Math.min(maxWidth, startWidth + delta))
        setChatWidth(newWidth)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [chatWidth]
  )

  return (
    <div
      ref={containerRef}
      className="gba:flex gba:h-full gba:w-full gba:overflow-hidden gba:bg-background gba:relative"
      data-testid={`${testId}-layout`}
    >
      {/* Chat Panel */}
      <div
        className="gba:shrink-0 gba:flex gba:flex-col gba:overflow-hidden gba:h-full gba:bg-background gba:border-r gba:border-border gba:transition-[width,opacity] gba:duration-500 gba:ease-in-out"
        style={{ width: chatWidth, opacity: 1 }}
        data-testid={`${testId}-chat-panel`}
      >
        {chatPanel}
      </div>

      {/* Resize Handle - Overlays the border */}
      <div
        className={`gba:absolute gba:w-1 gba:h-full gba:cursor-col-resize gba:transition-all gba:duration-200 gba:z-20 ${
          isDragging ? 'gba:bg-primary' : 'gba:bg-transparent gba:hover:bg-primary/30'
        }`}
        style={{ left: chatWidth - 2 }}
        onMouseDown={handleMouseDown}
        data-testid={`${testId}-resize-handle`}
      />

      {/* Canvas Panel */}
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-w-0 gba:bg-background"
        data-testid={`${testId}-canvas-panel`}
      >
        {canvasPanel}
      </div>
    </div>
  )
}
