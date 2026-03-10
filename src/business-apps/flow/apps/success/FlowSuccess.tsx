import React, { useCallback, useEffect, useState } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { TrendingUp, BarChart3, Shield, Timer, Workflow, AlertTriangle, GitBranch } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'

// Components
import { OverviewTab } from './components/tabs/OverviewTab'
import { FlowTab } from './components/tabs/FlowTab'
import { TrendsTab } from './components/tabs/TrendsTab'
import { TaskPerformanceTab } from './components/tabs/TaskPerformanceTab'
import { DecisionTab } from './components/tabs/DecisionTab'
import { AuditTab } from './components/tabs/AuditTab'
import { SLATab } from './components/tabs/SLATab'

interface FlowSuccessProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const VALID_VIEW_KEYS = new Set(['overview', 'flow', 'task-performance', 'sla', 'trends', 'decisions', 'audit'])

const FlowSuccessContent: React.FC<FlowSuccessProps> = ({
  prefixDataTestId = 'flow-success',
  accessToken,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState('overview')

  const viewOptions = [
    { key: 'overview', label: t('tab-overview'), icon: <BarChart3 className="gba:h-4 gba:w-4" /> },
    { key: 'flow', label: t('tab-flows'), icon: <Workflow className="gba:h-4 gba:w-4" /> },
    { key: 'task-performance', label: t('tab-tasks'), icon: <Timer className="gba:h-4 gba:w-4" /> },
    { key: 'sla', label: t('tab-sla'), icon: <AlertTriangle className="gba:h-4 gba:w-4" /> },
    { key: 'trends', label: t('tab-trends'), icon: <TrendingUp className="gba:h-4 gba:w-4" /> },
    { key: 'decisions', label: t('tab-decisions'), icon: <GitBranch className="gba:h-4 gba:w-4" /> },
    { key: 'audit', label: t('tab-audit'), icon: <Shield className="gba:h-4 gba:w-4" /> }
  ]

  const resolveViewKey = useCallback((candidate?: string | null) => {
    if (!candidate) return null
    return VALID_VIEW_KEYS.has(candidate) ? candidate : null
  }, [])

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
      case 'decisions':
        return <DecisionTab accessToken={accessToken} prefixDataTestId={`${prefixDataTestId}-decisions`} {...context} />
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
        headerTitle={t('app-title')}
        headerDescription={t('app-description')}
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
        <div
          className="gba:mx-auto gba:flex gba:w-full gba:max-w-[1400px] gba:flex-col gba:gap-6 gba:px-1 gba:pb-6"
          data-testid={`${prefixDataTestId}-content-shell`}
        >
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  )
}

export const FlowSuccess: React.FC<FlowSuccessProps> = props => {
  // Pre-register the bundle before PageLayout mounts so header labels do not flash raw keys.
  useTranslation(translations)
  return <FlowSuccessContent {...props} />
}

export default FlowSuccess
