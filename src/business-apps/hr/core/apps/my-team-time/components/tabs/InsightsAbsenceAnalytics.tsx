import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AbsenceDistributionSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/AbsenceDistributionSection'
import { UsagePatternsSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/UsagePatternsSection'
import { AbsenceTrendsSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/AbsenceTrendsSection'
import { YearComparisonSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/YearComparisonSection'
import { useAbsenceStatisticsSimple } from '../../../../../absences/apps/manager-absences/hooks/useAbsenceStatisticsSimple'

export const InsightsAbsenceAnalytics: React.FC<BusinessAppContextProps> = props => {
  const { statistics: absenceStatistics } = useAbsenceStatisticsSimple(props)

  return (
    <>
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        <AbsenceDistributionSection {...props} />
        <UsagePatternsSection data={absenceStatistics} />
      </div>
      <AbsenceTrendsSection {...props} />
      <YearComparisonSection data={absenceStatistics} />
    </>
  )
}
