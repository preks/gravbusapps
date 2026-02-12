import { useState, useCallback, useRef } from 'react'

interface NexusLayoutProps {
  chatPanel: React.ReactNode
  canvasPanel: React.ReactNode
  sidebar?: React.ReactNode
  sidebarOpen: boolean
  chatVisible: boolean
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
  chatVisible,
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

  const panelOpen = chatVisible || sidebarOpen

  return (
    <div
      ref={containerRef}
      className="gba:flex gba:h-full gba:w-full gba:overflow-hidden gba:bg-background"
      data-testid={`${testId}-layout`}
    >
      {/* Chat / Sidebar Panel — slides in/out with CSS transition */}
      <div
        className="gba:flex-shrink-0 gba:flex gba:flex-col gba:overflow-hidden gba:bg-background gba:transition-[width,opacity] gba:duration-500 gba:ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: panelOpen ? chatWidth : 0, opacity: panelOpen ? 1 : 0 }}
        data-testid={`${testId}-chat-panel`}
      >
        {sidebarOpen && sidebar ? sidebar : chatPanel}
      </div>

      {/* Resize Handle — only visible when panel is open */}
      <div
        className={`gba:flex-shrink-0 gba:transition-all gba:duration-500 ${
          panelOpen ? 'gba:w-1 gba:cursor-col-resize' : 'gba:w-0'
        } ${isDragging ? 'gba:bg-primary' : 'gba:bg-transparent gba:hover:bg-primary/30'}`}
        onMouseDown={panelOpen ? handleMouseDown : undefined}
        data-testid={`${testId}-resize-handle`}
      />

      {/* Canvas Panel */}
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-w-0 gba:bg-muted/20"
        data-testid={`${testId}-canvas-panel`}
      >
        {canvasPanel}
      </div>
    </div>
  )
}
