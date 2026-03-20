import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { buildIrmActivityConfig } from './config/activityConfig'
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities'
import { useInvestmentActivityStatistics } from '@/common/data/investment/hooks/useInvestmentActivityStatistics'

export type ActivityViewProps = BusinessAppContextProps

/**
 * Activities Tab — shows all activities for all employees.
 * Mirrors IRM TaskView pattern: hooks at component level, config memoized.
 */
export const ActivityView: React.FC<ActivityViewProps> = props => {
  const { fetchInvestmentActivities } = useGetInvestmentActivities(props)
  const activityStatistics = useInvestmentActivityStatistics(props)

  const config = useMemo(() => buildIrmActivityConfig(fetchInvestmentActivities), [fetchInvestmentActivities])

  return (
    <ActivityLayout
      context={props}
      config={config}
      dataTestId="irm-activity-view"
      showOwnerEmployee
      enableExport
      exportFilenamePrefix="irm-activities"
      kpiStatistics={activityStatistics.teamActivitiesStatistics}
      kpiLoading={activityStatistics.isLoading}
      kpiError={activityStatistics.error}
      onKpiRetry={() => {
        void activityStatistics.refetch()
      }}
    />
  )
}

export default ActivityView
