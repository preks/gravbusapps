import React from 'react'
import { useResizablePanel } from '@/common/hooks/useResizablePanel'

interface CreateLayoutProps {
  chatPanel: React.ReactNode
  canvasPanel: React.ReactNode
  testId?: string
}

export const CreateLayout = ({ chatPanel, canvasPanel, testId = 'create-orchestrator' }: CreateLayoutProps) => {
  const { panelWidth, isDragging, containerRef, handleMouseDown } = useResizablePanel()

  const handleResizeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
    }
  }

  return (
    <div
      ref={containerRef}
      className="gba:flex gba:h-full gba:w-full gba:overflow-hidden gba:bg-background gba:relative"
      data-testid={`${testId}-layout`}
    >
      {/* Chat Panel */}
      <div
        className="gba:shrink-0 gba:flex gba:flex-col gba:overflow-hidden gba:h-full gba:bg-background gba:border-r gba:border-border gba:transition-[width,opacity] gba:duration-500 gba:ease-in-out"
        style={{ width: panelWidth, opacity: 1 }}
        data-testid={`${testId}-chat-panel`}
      >
        {chatPanel}
      </div>

      {/* Resize Handle - Overlays the border */}
      <div
        role="separator"
        aria-label="Resize panel"
        aria-orientation="vertical"
        tabIndex={0}
        className={`gba:absolute gba:w-1 gba:h-full gba:cursor-col-resize gba:transition-all gba:duration-200 gba:z-20 ${
          isDragging ? 'gba:bg-primary' : 'gba:bg-transparent gba:hover:bg-primary/30'
        }`}
        style={{ left: panelWidth - 2 }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleResizeKeyDown}
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
