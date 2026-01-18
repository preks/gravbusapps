import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, PageLayout } from '@newwork/nw-design-system'
import { TrendingUp, BarChart3, Shield, Timer, Workflow, AlertTriangle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Components
import { OverviewTab } from './components/tabs/OverviewTab'
import { FlowTab } from './components/tabs/FlowTab'
import { TrendsTab } from './components/tabs/TrendsTab'
import { TaskPerformanceTab } from './components/tabs/TaskPerformanceTab'
import { AuditTab } from './components/tabs/AuditTab'
import { SLATab } from './components/tabs/SLATab'

interface FlowSuccessProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const FlowSuccess: React.FC<FlowSuccessProps> = ({
  prefixDataTestId = 'flow-success',
  accessToken,
  ...context
}) => {
  const [activeTab, setActiveTab] = useState('overview')

  const viewOptions = useMemo(
    () => [
      { key: 'overview', label: 'Overview', icon: <BarChart3 className="gba:h-4 gba:w-4" /> },
      { key: 'flow', label: 'Flows', icon: <Workflow className="gba:h-4 gba:w-4" /> },
      { key: 'task-performance', label: 'Tasks', icon: <Timer className="gba:h-4 gba:w-4" /> },
      { key: 'sla', label: 'SLA', icon: <AlertTriangle className="gba:h-4 gba:w-4" /> },
      { key: 'trends', label: 'Trends', icon: <TrendingUp className="gba:h-4 gba:w-4" /> },
      { key: 'audit', label: 'Audit', icon: <Shield className="gba:h-4 gba:w-4" /> }
    ],
    []
  )

  const resolveViewKey = useCallback(
    (candidate?: string | null) => {
      if (!candidate) return null
      return viewOptions.some(option => option.key === candidate) ? candidate : null
    },
    [viewOptions]
  )

  // Sync tab with URL hash (deep linking)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      const validated = resolveViewKey(hash)
      if (validated) setActiveTab(validated)
    }

    applyHash()
    const handler = () => applyHash()
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [resolveViewKey])

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab
    }
  }, [activeTab])

  const handleTabChange = (value: string) => {
    // Prevent deselection - if value is empty or same as current, ignore
    if (!value || value === activeTab) return
    setActiveTab(value)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab accessToken={accessToken} prefixDataTestId={`${prefixDataTestId}-overview`} {...context} />
      case 'flow':
        return <FlowTab accessToken={accessToken} prefixDataTestId={`${prefixDataTestId}-flow`} {...context} />
      case 'task-performance':
        return (
          <TaskPerformanceTab
            accessToken={accessToken}
            prefixDataTestId={`${prefixDataTestId}-task-performance`}
            {...context}
          />
        )
      case 'sla':
        return <SLATab accessToken={accessToken} prefixDataTestId={`${prefixDataTestId}-sla`} {...context} />
      case 'trends':
        return <TrendsTab accessToken={accessToken} prefixDataTestId={`${prefixDataTestId}-trends`} {...context} />
      case 'audit':
        return <AuditTab accessToken={accessToken} prefixDataTestId={`${prefixDataTestId}-audit`} {...context} />
      default:
        return null
    }
  }

  return (
    <div data-testid={prefixDataTestId}>
      <PageLayout
        headerIcon={TrendingUp}
        headerTitle="FLOW Success"
        headerDescription="Workflow Outcomes & Performance Insights"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <Card className="gba:w-full" data-testid={`${prefixDataTestId}-content-card`}>
          <CardContent className="gba:p-6">{renderTabContent()}</CardContent>
        </Card>
      </PageLayout>
    </div>
  )
}

export default FlowSuccess
