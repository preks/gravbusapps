import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActivityStatistics, type ActivityStatistics } from '@/common/data/relations/hooks/useActivityStatistics'
import { GET_ACTIVITY_KPIS } from '@/business-apps/crm/core/apps/customer-relations/views/activity-view/queries/activityKpisQueries'

export type CustomerActivityStatistics = ActivityStatistics

export const useCustomerActivityStatistics = (context: BusinessAppContextProps): CustomerActivityStatistics => {
  return useActivityStatistics(context, GET_ACTIVITY_KPIS)
}
