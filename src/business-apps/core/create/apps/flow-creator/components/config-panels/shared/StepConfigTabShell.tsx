import React, { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'

export interface StepConfigTabItem {
  id: string
  label: string
  icon: React.FC<{ className?: string }>
  content: React.ReactNode
}

interface StepConfigTabShellProps {
  tabs: StepConfigTabItem[]
  testId: string
  defaultTabId?: string
}

export const StepConfigTabShell: React.FC<StepConfigTabShellProps> = ({ tabs, testId, defaultTabId }) => {
  const visibleTabs = useMemo(() => tabs.filter(tab => tab.content != null), [tabs])
  const initialTab = defaultTabId ?? visibleTabs[0]?.id ?? 'general'
  const [activeTab, setActiveTab] = useState(initialTab)
  const showTabBar = visibleTabs.length > 1
  const contentPaddingClassName = showTabBar ? 'gba:p-5' : 'gba:px-5 gba:py-4'

  useEffect(() => {
    if (visibleTabs.some(tab => tab.id === activeTab)) return
    setActiveTab(visibleTabs[0]?.id ?? initialTab)
  }, [activeTab, initialTab, visibleTabs])

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden"
    >
      {showTabBar ? (
        <div className="gba:px-5 gba:pt-3">
          <TabsList className="gba:w-full gba:bg-muted gba:p-1 gba:rounded-lg">
            {visibleTabs.map(tab => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  startIcon={<Icon className="gba:h-3.5 gba:w-3.5" />}
                  className={
                    activeTab === tab.id
                      ? 'gba:bg-background gba:text-foreground gba:font-semibold gba:shadow-sm'
                      : 'gba:text-muted-foreground'
                  }
                  data-testid={`${testId}-tab-${tab.id}`}
                >
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      ) : null}

      <div className="gba:flex-1 gba:overflow-y-auto">
        {visibleTabs.map(tab => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className={`gba:flex gba:flex-col gba:gap-4 gba:mt-0 ${contentPaddingClassName}`}
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}
