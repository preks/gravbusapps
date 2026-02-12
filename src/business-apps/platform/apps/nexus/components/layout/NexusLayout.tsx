import { useState, useCallback, useRef } from 'react'

interface NexusLayoutProps {
  chatPanel: React.ReactNode
  canvasPanel: React.ReactNode
  sidebar?: React.ReactNode
  sidebarOpen: boolean
  onSidebarClose: () => void
  testId?: string
}

const MIN_CHAT_WIDTH = 320
const MAX_CHAT_WIDTH_RATIO = 0.5
const DEFAULT_CHAT_WIDTH = 420

export const NexusLayout = ({
  chatPanel,
  canvasPanel,
  sidebar,
  sidebarOpen,
  onSidebarClose,
  testId = 'nexus'
}: NexusLayoutProps) => {
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
      className="gba:flex gba:h-full gba:w-full gba:overflow-hidden gba:bg-background"
      data-testid={`${testId}-layout`}
    >
      {/* Sidebar overlay */}
      {sidebarOpen && sidebar && (
        <>
          <div
            className="gba:fixed gba:inset-0 gba:z-40 gba:bg-muted/60"
            onClick={onSidebarClose}
            data-testid={`${testId}-sidebar-overlay`}
          />
          <div
            className="gba:fixed gba:left-0 gba:top-0 gba:bottom-0 gba:z-50 gba:w-80 gba:bg-background gba:border-r gba:border-border"
            data-testid={`${testId}-sidebar`}
          >
            {sidebar}
          </div>
        </>
      )}

      {/* Chat Panel */}
      <div
        className="gba:flex-shrink-0 gba:flex gba:flex-col gba:border-r gba:border-border gba:overflow-hidden"
        style={{ width: chatWidth }}
        data-testid={`${testId}-chat-panel`}
      >
        {chatPanel}
      </div>

      {/* Resize Handle */}
      <div
        className={`gba:w-1 gba:cursor-col-resize gba:flex-shrink-0 gba:transition-colors ${
          isDragging ? 'gba:bg-primary' : 'gba:bg-transparent gba:hover:bg-border'
        }`}
        onMouseDown={handleMouseDown}
        data-testid={`${testId}-resize-handle`}
      />

      {/* Canvas Panel */}
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-w-0"
        data-testid={`${testId}-canvas-panel`}
      >
        {canvasPanel}
      </div>
    </div>
  )
}
