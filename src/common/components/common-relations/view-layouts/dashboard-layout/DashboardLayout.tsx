import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, EmptyState } from '@newwork/nw-design-system'
import { Home, PieChart as PieChartIcon } from 'lucide-react'
import { OverviewTabLayout, OverviewTabLayoutProps } from './overview/OverviewTabLayout'
import { PipelineTabLayout, PipelineTabLayoutProps } from './pipeline/PipelineTabLayout'

export type DashboardTabKey = 'overview' | 'pipeline-details' | string

// Valid tab values for URL parameter
const VALID_TABS = new Set<DashboardTabKey>(['overview', 'pipeline-details'])

// Initialize tab state from URL parameter
const getInitialTabFromUrl = (): DashboardTabKey | null => {
  if (typeof globalThis.window === 'undefined') return null

  const urlParams = new URLSearchParams(globalThis.window.location.search)
  const tab = urlParams.get('tab')

  if (tab && VALID_TABS.has(tab)) {
    return tab
  }

  return null // Return null if no valid tab in URL
}

export interface DashboardLayoutProps {
  header?: React.ReactNode
  initialTab?: DashboardTabKey
  dataTestId?: string
  moduleColor?: string
  onTabChange?: (tabKey: DashboardTabKey) => void

  // Tab-specific props
  overviewProps?: OverviewTabLayoutProps
  pipelineProps?: PipelineTabLayoutProps
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  initialTab,
  dataTestId,
  moduleColor = 'default',
  onTabChange,
  overviewProps,
  pipelineProps
}) => {
  // Compute tabs before any conditional returns
  const tabs = useMemo(() => {
    const items: Array<{
      key: DashboardTabKey
      label: string
      icon: React.ReactNode
      content: React.ReactNode
      dataTestId?: string
    }> = []

    if (overviewProps) {
      items.push({
        key: 'overview',
        label: 'Overview',
        icon: <Home />,
        content: <OverviewTabLayout {...overviewProps} moduleColor={moduleColor} />,
        dataTestId: 'overview-dashboard-tab'
      })
    }

    if (pipelineProps) {
      items.push({
        key: 'pipeline-details',
        label: 'Pipeline Details',
        icon: <PieChartIcon />,
        content: <PipelineTabLayout {...pipelineProps} moduleColor={moduleColor} />,
        dataTestId: 'pipeline-details-dashboard-tab'
      })
    }

    return items
  }, [overviewProps, pipelineProps, moduleColor])

  // Initialize active tab from URL parameter, fallback to initialTab or first available tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlTab = getInitialTabFromUrl()
    return urlTab || initialTab || tabs[0]?.key || ''
  })

  // Check if there's no data to display
  const hasNoData = !overviewProps && !pipelineProps

  // Update URL when tab changes (bookmarkable tabs)
  const updateUrl = useCallback((tab: string) => {
    if (typeof globalThis.window === 'undefined') return

    const urlParams = new URLSearchParams(globalThis.window.location.search)
    urlParams.set('tab', tab)
    const newUrl = `${globalThis.window.location.pathname}?${urlParams.toString()}`
    globalThis.window.history.replaceState({}, '', newUrl)
  }, [])

  // Set initial URL parameter if missing (runs once on mount)
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return

    const urlParams = new URLSearchParams(globalThis.window.location.search)
    if (!urlParams.has('tab') && activeTab) {
      updateUrl(activeTab)
    }
  }, [activeTab, updateUrl])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return

    const handlePopState = () => {
      const newTab = getInitialTabFromUrl()
      if (newTab) {
        setActiveTab(newTab)
      }
    }

    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [])

  if (hasNoData) {
    return (
      <div className="gba:p-6" data-testid={dataTestId || 'dashboard-layout'}>
        {header}
        <EmptyState
          type="no-data"
          title="No Dashboard Data"
          description="Unable to load dashboard data or no pipelines available"
          data-testid={`${dataTestId || 'dashboard-layout'}-empty-state`}
        />
      </div>
    )
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    updateUrl(key)
    onTabChange?.(key)
  }

  return (
    <div className="gba:p-6" data-testid={dataTestId || 'dashboard-layout'}>
      {header}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full">
        <TabsList className="gba:mb-6">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} startIcon={t.icon} data-testid={t.dataTestId || `${t.key}-tab`}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.key} value={t.key} className="gba:space-y-6">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default DashboardLayout
