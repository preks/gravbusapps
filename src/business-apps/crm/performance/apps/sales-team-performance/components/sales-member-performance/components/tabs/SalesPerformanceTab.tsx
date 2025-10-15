import React from 'react'
import { PerformanceStatistics } from '../statistics'
import { PerformanceTrendsChart } from '../performance-trends'
import { EntitiesOwnedSection } from '../entities'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntitiesOwned } from '../../types'

const DATA_TEST_ID_PREFIX = 'SalesPerformanceTab'

interface SalesPerformanceTabProps extends BusinessAppContextProps {
  employeeId: string
  entitiesOwned?: EntitiesOwned // Make optional since we use real data
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  // Enhanced context for comparisons
  teamContext?: {
    teamId: string
    teamName: string
  }
  showComparisons?: boolean
}

export const SalesPerformanceTab: React.FC<SalesPerformanceTabProps> = ({
  employeeId,
  entitiesOwned = { leads: [], contacts: [], opportunities: [], accounts: [] },
  accessToken,
  isLoading = false,
  error = null,
  onRetry,
  teamContext,
  showComparisons = true,
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
        {...context}
      />

      {/* Performance Trends Chart Section */}
      <PerformanceTrendsChart employeeId={employeeId} accessToken={accessToken} {...context} />

      {/* Entities Owned Section */}
      <EntitiesOwnedSection
        employeeId={employeeId}
        entitiesOwned={entitiesOwned}
        accessToken={accessToken}
        isLoading={isLoading}
      />
    </div>
  )
}

export default SalesPerformanceTab
