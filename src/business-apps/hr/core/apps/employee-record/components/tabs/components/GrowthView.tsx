'use client'

import React from 'react'
import { GrowthData } from '../../../types/compensationTypes'
import GrowthStatistics from './GrowthStatistics'
import GrowthTimelineChart from './GrowthTimelineChart'
import GrowthMilestoneCard from './GrowthMilestoneCard'

interface GrowthViewProps {
  growthData: GrowthData
  loading: boolean
}

/**
 * Growth View Component
 * Main container for the compensation growth timeline tab
 * Displays growth statistics, timeline chart, and career milestones
 */
const GrowthView: React.FC<GrowthViewProps> = ({ growthData, loading }) => {
  return (
    <div className="gba:space-y-6" data-testid="growth-view">
      {/* Growth Statistics KPI Cards */}
      <GrowthStatistics growthData={growthData} loading={loading} />

      {/* Timeline Chart */}
      <GrowthTimelineChart growthData={growthData} loading={loading} />

      {/* Career Milestones Timeline */}
      <GrowthMilestoneCard growthData={growthData} loading={loading} />
    </div>
  )
}

export default GrowthView
