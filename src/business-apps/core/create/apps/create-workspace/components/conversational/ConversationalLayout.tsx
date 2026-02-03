/**
 * ConversationalLayout - Split layout for conversational AI orchestrator
 * Left: Chat panel with message history
 * Right: Canvas with current work view
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'

export interface ConversationalLayoutProps {
  chatPanel: React.ReactNode
  canvas: React.ReactNode
  showChat?: boolean
  className?: string
  'data-testid'?: string
}

export const ConversationalLayout: React.FC<ConversationalLayoutProps> = ({
  chatPanel,
  canvas,
  showChat = true,
  className,
  'data-testid': testId = 'conversational-layout'
}) => {
  return (
    <div className={cn('gba:flex gba:h-screen gba:overflow-hidden gba:bg-background', className)} data-testid={testId}>
      {/* Chat Panel - Left Sidebar, constrained to viewport */}
      {showChat && (
        <aside
          className="gba:w-[400px] gba:shrink-0 gba:border-r gba:border-border gba:bg-muted/30 gba:flex gba:flex-col gba:h-screen gba:min-h-0"
          data-testid={`${testId}-chat-panel`}
        >
          {chatPanel}
        </aside>
      )}

      {/* Canvas - Main Work Area */}
      <main className="gba:flex-1 gba:min-h-0 gba:overflow-auto gba:flex gba:flex-col" data-testid={`${testId}-canvas`}>
        {canvas}
      </main>
    </div>
  )
}

export default ConversationalLayout
