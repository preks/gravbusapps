import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, EmptyState, useTranslation } from '@newwork/nw-design-system'
import { Home, PieChart as PieChartIcon } from 'lucide-react'
import { OverviewTabLayout, OverviewTabLayoutProps } from './overview/OverviewTabLayout'
import { PipelineTabLayout, PipelineTabLayoutProps } from './pipeline/PipelineTabLayout'
import translations from './_i18n'

export type DashboardTabKey = 'overview' | 'pipeline-details' | string

// Initialize tab state from URL parameter with dynamic validation
const getInitialTabFromUrl = (validTabs: Set<string>): DashboardTabKey | null => {
  if (typeof globalThis.window === 'undefined') return null

  const urlParams = new URLSearchParams(globalThis.window.location.search)
  const tab = urlParams.get('tab')

  if (tab && validTabs.has(tab)) {
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
  const { t } = useTranslation(translations)

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
        label: t('tab-overview'),
        icon: <Home />,
        content: <OverviewTabLayout {...overviewProps} moduleColor={moduleColor} />,
        dataTestId: 'overview-dashboard-tab'
      })
    }

    if (pipelineProps) {
      items.push({
        key: 'pipeline-details',
        label: t('tab-pipeline-details'),
        icon: <PieChartIcon />,
        content: <PipelineTabLayout {...pipelineProps} moduleColor={moduleColor} />,
        dataTestId: 'pipeline-details-dashboard-tab'
      })
    }

    return items
  }, [overviewProps, pipelineProps, moduleColor, t])

  // Compute valid tab keys dynamically based on available tabs
  const validTabKeys = useMemo(() => new Set(tabs.map(t => t.key)), [tabs])

  // Initialize active tab from URL parameter, fallback to initialTab or first available tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlTab = getInitialTabFromUrl(validTabKeys)
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

  // Reset active tab if it becomes invalid (e.g., when a tab is hidden via config)
  useEffect(() => {
    if (tabs.length > 0 && !validTabKeys.has(activeTab)) {
      const firstTab = tabs[0].key
      setActiveTab(firstTab)
      updateUrl(firstTab)
    }
  }, [tabs, validTabKeys, activeTab, updateUrl])

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
      const newTab = getInitialTabFromUrl(validTabKeys)
      if (newTab) {
        setActiveTab(newTab)
      }
    }

    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [validTabKeys])

  if (hasNoData) {
    return (
      <div className="gba:p-6" data-testid={dataTestId || 'dashboard-layout'}>
        {header}
        <EmptyState
          type="no-data"
          title={t('empty-title')}
          description={t('empty-description')}
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
        {tabs.length > 1 && (
          <TabsList className="gba:mb-6">
            {tabs.map(t => (
              <TabsTrigger key={t.key} value={t.key} startIcon={t.icon} data-testid={t.dataTestId || `${t.key}-tab`}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

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
