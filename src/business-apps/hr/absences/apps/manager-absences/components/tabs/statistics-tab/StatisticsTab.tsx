import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAbsenceStatisticsSimple } from '../../../hooks/useAbsenceStatisticsSimple'
import { KeyInsightsSection } from './KeyInsightsSection'
import { QuickActionsSection } from './QuickActionsSection'
import { UsagePatternsSection } from './UsagePatternsSection'
import { YearComparisonSection } from './YearComparisonSection'
import { AbsenceDistributionSection } from './AbsenceDistributionSection'
import { AbsenceTrendsSection } from './AbsenceTrendsSection'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface StatisticsTabProps extends BusinessAppContextProps {
  onNavigateToWorkLifeBalance?: () => void
  onNavigateToTeamCoverage?: () => void
}

export const StatisticsTab: React.FC<StatisticsTabProps> = props => {
  const { statistics, isLoading, error } = useAbsenceStatisticsSimple(props)

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="statistics-tab-loading">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="statistics-tab-error">
        Error: {error}
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="statistics-tab-no-data">
        No statistics data available.
      </div>
    )
  }

  return (
    <div className="gba:p-6 gba:w-full" data-testid="statistics-tab">
      <div className="gba:pb-6" data-testid="statistics-tab-key-insights">
        <KeyInsightsSection data={statistics} context={props} />
      </div>
      <div className="gba:pb-6" data-testid="statistics-tab-quick-actions">
        <QuickActionsSection
          data={statistics}
          onNavigateToWorkLifeBalance={props.onNavigateToWorkLifeBalance}
          onNavigateToTeamCoverage={props.onNavigateToTeamCoverage}
        />
      </div>
      <div className="gba:mb-6" data-testid="statistics-tab-distribution-patterns">
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
          <div data-testid="statistics-tab-absence-distribution">
            <AbsenceDistributionSection {...props} />
          </div>
          <div data-testid="statistics-tab-usage-patterns">
            <UsagePatternsSection data={statistics} />
          </div>
        </div>
      </div>
      <div className="gba:mb-6" data-testid="statistics-tab-absence-trends">
        <AbsenceTrendsSection {...props} />
      </div>
      <div data-testid="statistics-tab-year-comparison">
        <YearComparisonSection {...props} />
      </div>
    </div>
  )
}
