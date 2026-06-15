import React from 'react'
import { PerformanceStatistics } from '../statistics/PerformanceStatistics'
import { PerformanceTrendsChart } from '../performance-trends/PerformanceTrendsChart'
import { EntitiesOwnedSection } from '../entities/EntitiesOwnedSection'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
const DATA_TEST_ID_PREFIX = 'SalesPerformanceTab'

interface SalesPerformanceTabProps extends BusinessAppContextProps {
  employeeId: string
  error?: Error | null
  onRetry?: () => void
  currencyCode?: string
  // Enhanced context for comparisons
  teamContext?: {
    teamId: string
    teamName: string
  }
  showComparisons?: boolean
}

export const SalesPerformanceTab: React.FC<SalesPerformanceTabProps> = ({
  employeeId,
  accessToken,
  onRetry,
  teamContext,
  showComparisons = true,
  currencyCode,
  ...context
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Performance Statistics Section with Enhanced Context */}
      <PerformanceStatistics
        employeeId={employeeId}
        accessToken={accessToken}
        onRetry={onRetry}
        teamContext={teamContext}
        showComparisons={showComparisons}
        currencyCode={currencyCode}
        {...context}
      />

      {/* Performance Trends Chart Section */}
      <PerformanceTrendsChart employeeId={employeeId} accessToken={accessToken} {...context} />

      {/* Entities Owned Section */}
      <EntitiesOwnedSection employeeId={employeeId} accessToken={accessToken} />
    </div>
  )
}

export default SalesPerformanceTab
