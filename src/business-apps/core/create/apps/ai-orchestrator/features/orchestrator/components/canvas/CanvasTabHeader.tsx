/**
 * CanvasTabHeader - Horizontal tab bar displayed above the canvas in complete state.
 * Tabs: Screen, Data Model, Functions, Task Expert, Flow.
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'
import { Monitor, Database, Code2, Bot, Workflow, Info, ClipboardList, Layers } from 'lucide-react'
import type { CanvasTab } from '../../types/chat'
import { CANVAS_TABS } from '../../types/chat'

interface CanvasTabHeaderProps {
  activeTab: CanvasTab
  onTabChange: (tab: CanvasTab) => void
  testId?: string
}

const TAB_ICONS: Record<CanvasTab, React.ElementType> = {
  'build-plan': ClipboardList,
  'data-flow': Layers,
  screen: Monitor,
  'data-model': Database,
  functions: Code2,
  'task-expert': Bot,
  flow: Workflow,
  about: Info
}

export const CanvasTabHeader: React.FC<CanvasTabHeaderProps> = ({
  activeTab,
  onTabChange,
  testId = 'canvas-tab-header'
}) => {
  return (
    <div
      className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-background gba:shrink-0"
      data-testid={testId}
    >
      {CANVAS_TABS.map(tab => {
        const Icon = TAB_ICONS[tab.id]
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all gba:duration-200',
              isActive
                ? 'gba:bg-primary gba:text-primary-foreground'
                : 'gba:text-muted-foreground gba:hover:bg-muted gba:hover:text-foreground'
            )}
            data-testid={`${testId}-${tab.id}`}
          >
            <Icon className="gba:w-3.5 gba:h-3.5" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
