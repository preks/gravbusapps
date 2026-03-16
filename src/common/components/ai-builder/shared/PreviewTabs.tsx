/**
 * Shared Overview / Try it tabs layout for AI builder previews.
 */

import React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { LayoutList, Play } from 'lucide-react'

export type PreviewTabValue = 'overview' | 'try-it'

export interface PreviewTabsProps {
  value: PreviewTabValue
  onValueChange: (value: PreviewTabValue) => void
  testId: string
  className?: string
  children: React.ReactNode
}

const TABS_LIST_CLASS =
  'gba:w-full gba:grid gba:grid-cols-2 gba:shrink-0 gba:h-11 gba:p-1 gba:bg-muted gba:rounded-lg gba:items-stretch'
const TRIGGER_CLASS =
  'gba:inline-flex gba:items-center gba:justify-center gba:gap-1.5 gba:h-full gba:min-h-0 gba:py-0 gba:rounded-md'

export function PreviewTabs({
  value,
  onValueChange,
  testId,
  className = 'gba:flex gba:flex-col gba:gap-3 gba:min-h-0',
  children
}: PreviewTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={v => onValueChange(v as PreviewTabValue)}
      className={className}
      data-testid={`${testId}-tabs`}
    >
      <TabsList className={TABS_LIST_CLASS} data-testid={`${testId}-tabs-list`}>
        <TabsTrigger value="overview" className={TRIGGER_CLASS} data-testid={`${testId}-tab-overview`}>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5">
            <LayoutList className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
            <span>Overview</span>
          </span>
        </TabsTrigger>
        <TabsTrigger value="try-it" className={TRIGGER_CLASS} data-testid={`${testId}-tab-try-it`}>
          <span className="gba:inline-flex gba:items-center gba:gap-1.5">
            <Play className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
            <span>Try it</span>
          </span>
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}
