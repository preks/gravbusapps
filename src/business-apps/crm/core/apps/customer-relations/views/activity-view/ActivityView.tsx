import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { buildCrmActivityConfig } from './config/activityConfig'
import { useActivityKpis } from './hooks/useActivityKpis'

export type ActivityViewProps = BusinessAppContextProps

export const ActivityView: React.FC<ActivityViewProps> = props => {
  const config = buildCrmActivityConfig(props)
  const employeeId = props.userInfo?.employeeDetails?.employeeId || props.userInfo?.id || ''

  // Fetch activity KPIs
  const {
    kpis,
    loading: kpiLoading,
    error: kpiError,
    refetch: kpiRefetch
  } = useActivityKpis({
    employeeId,
    accessToken: props.accessToken
  })

  return (
    <ActivityLayout
      context={props}
      config={config}
      dataTestId="crm-activity-view"
      showOwnerEmployee
      kpiStatistics={kpis}
      kpiLoading={kpiLoading}
      kpiError={kpiError}
      onKpiRetry={kpiRefetch}
    />
  )
}

export default ActivityView
