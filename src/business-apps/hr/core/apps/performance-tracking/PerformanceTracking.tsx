import React, { useState } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ChartBar } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { CycleTrackingTab } from './components/CycleTrackingTab'
import { ReviewerTrackingTab } from './components/ReviewerTrackingTab'

enum TrackingTab {
  CycleTracking = 'cycle-tracking',
  ReviewerTracking = 'reviewer-tracking'
}

export const PerformanceTracking: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [activeTab, setActiveTab] = useState<TrackingTab>(TrackingTab.CycleTracking)

  return (
    <PageLayout
      headerIcon={ChartBar}
      headerTitle="Performance Tracking"
      headerDescription="Monitor evaluation progress across performance cycles"
      headerSubViews={{
        value: activeTab,
        onValueChange: value => setActiveTab(value as TrackingTab),
        items: [
          { value: TrackingTab.CycleTracking, label: 'Performance Cycle Tracking' },
          { value: TrackingTab.ReviewerTracking, label: 'Reviewers Tracking' }
        ]
      }}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen gba:space-y-6"
      data-testid="performance-tracking-page"
    >
      {activeTab === TrackingTab.CycleTracking && <CycleTrackingTab accessToken={accessToken} />}
      {activeTab === TrackingTab.ReviewerTracking && <ReviewerTrackingTab accessToken={accessToken} />}
    </PageLayout>
  )
}

export default PerformanceTracking
