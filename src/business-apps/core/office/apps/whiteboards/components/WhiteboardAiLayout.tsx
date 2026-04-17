import { useState, useCallback, useRef } from 'react'

interface WhiteboardAiLayoutProps {
  chatPanel: React.ReactNode
  canvasPanel: React.ReactNode
  chatVisible: boolean
  testId?: string
}

const MIN_CHAT_WIDTH = 320
const MAX_CHAT_WIDTH_RATIO = 0.5
const DEFAULT_CHAT_WIDTH = 420

export const WhiteboardAiLayout = ({
  chatPanel,
  canvasPanel,
  chatVisible,
  testId = 'whiteboard-ai'
}: WhiteboardAiLayoutProps) => {
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
      <div
        className="gba:flex-shrink-0 gba:flex gba:flex-col gba:overflow-hidden gba:bg-background gba:transition-[width,opacity] gba:duration-500 gba:ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: chatVisible ? chatWidth : 0, opacity: chatVisible ? 1 : 0 }}
        data-testid={`${testId}-chat-panel`}
      >
        {chatPanel}
      </div>

      <div
        className={`gba:flex-shrink-0 gba:transition-all gba:duration-500 ${
          chatVisible ? 'gba:w-1 gba:cursor-col-resize' : 'gba:w-0'
        } ${isDragging ? 'gba:bg-primary' : 'gba:bg-transparent gba:hover:bg-primary/30'}`}
        onMouseDown={chatVisible ? handleMouseDown : undefined}
        data-testid={`${testId}-resize-handle`}
      />

      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:min-w-0"
        data-testid={`${testId}-canvas-panel`}
      >
        {canvasPanel}
      </div>
    </div>
  )
}
