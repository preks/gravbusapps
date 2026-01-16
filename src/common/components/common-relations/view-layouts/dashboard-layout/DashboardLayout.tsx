import React, { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, EmptyState } from '@newwork/nw-design-system'
import { Home, PieChart as PieChartIcon } from 'lucide-react'
import { OverviewTabLayout, OverviewTabLayoutProps } from './overview/OverviewTabLayout'
import { PipelineTabLayout, PipelineTabLayoutProps } from './pipeline/PipelineTabLayout'

export type DashboardTabKey = 'overview' | 'pipeline-details' | string

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

  const [activeTab, setActiveTab] = useState<string>(initialTab || tabs[0]?.key || '')

  // Check if there's no data to display
  const hasNoData = !overviewProps && !pipelineProps

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
