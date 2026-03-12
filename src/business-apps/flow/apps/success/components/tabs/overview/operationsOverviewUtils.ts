import type { FlowSuccessFlowListItem } from '../../../hooks/useFlowAnalytics.types'
import type { GuardianVelocityInsightsData } from '../../../hooks/useGuardianVelocityInsights'
import type { SystemTaskReliabilityData } from '../../../hooks/useSystemTaskReliability'

export interface OperationsOverviewSlaQueueItem {
  flowId: string
  flowName: string
  templateId: string
  status: string
  lastActivityTime?: string
  dueDate?: string
  topStep?: string
  slaViolations: number
  violationRate: number
  avgOverdueHours: number
}

export const getStalledFlows = (flows: FlowSuccessFlowListItem[], limit = 25): FlowSuccessFlowListItem[] =>
  flows
    .filter(flow => flow.processHealth?.isStalled)
    .sort(
      (left, right) => (right.timeInsights?.daysSinceLastUpdate || 0) - (left.timeInsights?.daysSinceLastUpdate || 0)
    )
    .slice(0, limit)

export const getTopBottlenecks = (
  bottlenecks: GuardianVelocityInsightsData['bottlenecks'] = [],
  limit = 25
): GuardianVelocityInsightsData['bottlenecks'] =>
  [...bottlenecks]
    .sort((left, right) => {
      if (right.impactScore !== left.impactScore) return right.impactScore - left.impactScore
      return right.affectedCount - left.affectedCount
    })
    .slice(0, limit)

export const getRecentFailureTrend = (
  timeSeries: SystemTaskReliabilityData['timeSeries'] = [],
  limit = 25
): SystemTaskReliabilityData['timeSeries'] =>
  [...timeSeries]
    .sort((left, right) => new Date(right.period).getTime() - new Date(left.period).getTime())
    .slice(0, limit)
