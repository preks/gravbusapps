'use client'

import React from 'react'
import { GrowthData } from '../types/compensationTypes'
import GrowthStatistics from '../components/growth/GrowthStatistics'
import GrowthTimelineChart from '../components/growth/GrowthTimelineChart'
import GrowthMilestoneCard from '../components/growth/GrowthMilestoneCard'

interface GrowthViewProps {
  t: (key: string, params?: any) => string
  growthData: GrowthData
  loading: boolean
  locale: string
}

/**
 * Growth View Component
 * Main container for the compensation growth timeline tab
 * Displays growth statistics, timeline chart, and career milestones
 */
const GrowthView: React.FC<GrowthViewProps> = ({ t, growthData, loading, locale }) => {
  return (
    <div className="gba:space-y-6" data-testid="growth-view">
      {/* Growth Statistics KPI Cards */}
      <GrowthStatistics t={t} growthData={growthData} loading={loading} locale={locale} />

      {/* Timeline Chart */}
      <GrowthTimelineChart t={t} growthData={growthData} loading={loading} locale={locale} />

      {/* Career Milestones Timeline */}
      <GrowthMilestoneCard t={t} growthData={growthData} loading={loading} locale={locale} />
    </div>
  )
}

export default GrowthView
