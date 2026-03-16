import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActivityStatistics, type ActivityStatistics } from '@/common/data/relations/hooks/useActivityStatistics'
import { GET_ACTIVITY_KPIS } from '@/business-apps/irm/core/apps/investment-relations/views/activity-view/queries/activityKpisQueries'

export type InvestmentActivityStatistics = ActivityStatistics

export const useInvestmentActivityStatistics = (context: BusinessAppContextProps): InvestmentActivityStatistics => {
  return useActivityStatistics(context, GET_ACTIVITY_KPIS)
}
