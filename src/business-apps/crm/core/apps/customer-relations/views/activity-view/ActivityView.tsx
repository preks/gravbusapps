import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { buildCrmActivityConfig } from './config/activityConfig'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerActivityStatistics } from '@/common/data/customer/hooks/useCustomerActivityStatistics'

export type ActivityViewProps = BusinessAppContextProps

/**
 * Activities Tab — shows all activities for all employees.
 * Mirrors the pattern of TaskView: hooks are called at component level,
 * config is memoized so ActivityLayout never sees a new object reference
 * on every render (which would cause duplicate fetches).
 */
export const ActivityView: React.FC<ActivityViewProps> = props => {
  // Call hooks at component level (same pattern as TaskView)
  const { fetchCustomerActivities } = useCustomerActivities(props)
  const activityStatistics = useCustomerActivityStatistics(props)

  // Memoize config — new object only when fetchCustomerActivities actually changes
  const config = useMemo(() => buildCrmActivityConfig(fetchCustomerActivities), [fetchCustomerActivities])

  return (
    <ActivityLayout
      context={props}
      config={config}
      dataTestId="crm-activity-view"
      showOwnerEmployee
      enableExport
      exportFilenamePrefix="crm-activities"
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
