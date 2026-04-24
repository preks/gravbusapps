/**
 * CanvasTabHeader - Horizontal tab bar displayed above the canvas in complete state.
 * Tabs: Screen, Data Model, Functions, Task Expert, Flow.
 */

import React from 'react'
import { cn, useTranslation } from '@newwork/nw-design-system'
import { Monitor, Database, Code2, Bot, Workflow, Info, ClipboardList, Layers, Network } from 'lucide-react'
import type { CanvasTab, CanvasTabInfo } from '../../types/chat'
import { CANVAS_TABS } from '../../types/chat'
import translations from '../../../../_i18n'

interface CanvasTabHeaderProps {
  activeTab: CanvasTab
  onTabChange: (tab: CanvasTab) => void
  /** When provided, only these tabs are shown; otherwise all CANVAS_TABS are shown. */
  tabs?: CanvasTabInfo[]
  testId?: string
}

const TAB_ICONS: Record<CanvasTab, React.ElementType> = {
  'build-plan': ClipboardList,
  screen: Monitor,
  'data-model': Database,
  functions: Code2,
  'task-expert': Bot,
  flow: Workflow,
  'agent-mesh': Network,
  'data-flow': Layers,
  about: Info
}

export const CanvasTabHeader: React.FC<CanvasTabHeaderProps> = ({
  activeTab,
  onTabChange,
  tabs,
  testId = 'canvas-tab-header'
}) => {
  const { t } = useTranslation(translations)
  const baseTabs = tabs ?? CANVAS_TABS
  const tabsToRender = baseTabs.map(tab => (tab.id === 'task-expert' ? { ...tab, label: t('canvas-tab-agent') } : tab))
  return (
    <div
      className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-background gba:shrink-0"
      data-testid={testId}
    >
      {tabsToRender.map(tab => {
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
