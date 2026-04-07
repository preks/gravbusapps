import React, { useState, useMemo } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { ChartBar } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { CycleTrackingTab } from './components/CycleTrackingTab'
import { ReviewerTrackingTab } from './components/ReviewerTrackingTab'
import translations from './_i18n'

enum TrackingTab {
  CycleTracking = 'cycle-tracking',
  ReviewerTracking = 'reviewer-tracking'
}

export const PerformanceTracking: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const initialCycleId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('cycleId')
  }, [])
  const [activeTab, setActiveTab] = useState<TrackingTab>(TrackingTab.CycleTracking)
  const { t } = useTranslation(translations)

  return (
    <PageLayout
      headerIcon={ChartBar}
      headerTitle={t('page-title')}
      headerDescription={t('page-subtitle')}
      headerSubViews={{
        value: activeTab,
        onValueChange: value => setActiveTab(value as TrackingTab),
        items: [
          { value: TrackingTab.CycleTracking, label: t('tab-cycle-tracking') },
          { value: TrackingTab.ReviewerTracking, label: t('tab-reviewer-tracking') }
        ]
      }}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen gba:space-y-6"
      data-testid="performance-tracking-page"
    >
      {activeTab === TrackingTab.CycleTracking && (
        <CycleTrackingTab accessToken={accessToken} initialCycleId={initialCycleId} />
      )}
      {activeTab === TrackingTab.ReviewerTracking && <ReviewerTrackingTab accessToken={accessToken} />}
    </PageLayout>
  )
}

export default PerformanceTracking
