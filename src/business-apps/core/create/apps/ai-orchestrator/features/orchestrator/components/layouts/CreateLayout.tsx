import React from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@newwork/nw-design-system'

interface CreateLayoutProps {
  chatPanel: React.ReactNode
  canvasPanel: React.ReactNode
  sidebar?: React.ReactNode
  sidebarOpen?: boolean
  testId?: string
}

export const CreateLayout = ({
  chatPanel,
  canvasPanel,
  sidebar,
  sidebarOpen,
  testId = 'create-orchestrator'
}: CreateLayoutProps) => {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="gba:h-full gba:min-h-0 gba:w-full gba:bg-background"
      data-testid={`${testId}-layout`}
    >
      <ResizablePanel
        defaultSize="28%"
        minSize="20%"
        maxSize="50%"
        className="gba:flex gba:flex-col gba:min-h-0 gba:overflow-hidden gba:border-r gba:border-border"
      >
        <div className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid={`${testId}-chat-panel`}>
          {sidebarOpen && sidebar ? sidebar : chatPanel}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle className="gba:bg-border" data-testid={`${testId}-resize-handle`} />
      <ResizablePanel
        defaultSize="72%"
        minSize="50%"
        maxSize="80%"
        className="gba:flex gba:flex-col gba:min-h-0 gba:overflow-hidden"
      >
        <div
          className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden gba:min-w-0"
          data-testid={`${testId}-canvas-panel`}
        >
          {canvasPanel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
