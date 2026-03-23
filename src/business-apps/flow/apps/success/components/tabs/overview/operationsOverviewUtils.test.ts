import type { FlowSuccessFlowListItem } from '../../../hooks/useFlowAnalytics.types'
import { getRecentFailureTrend, getStalledFlows } from './operationsOverviewUtils'

const createFlow = (
  overrides: Partial<FlowSuccessFlowListItem> &
    Pick<FlowSuccessFlowListItem, 'flowId' | 'flowName' | 'templateId' | 'status'>
): FlowSuccessFlowListItem => ({
  flowId: overrides.flowId,
  flowName: overrides.flowName,
  templateId: overrides.templateId,
  status: overrides.status,
  startTime: overrides.startTime || '2026-03-01T09:00:00.000Z',
  updateTime: overrides.updateTime || '2026-03-01T10:00:00.000Z',
  endTime: overrides.endTime,
  lastActivityTime: overrides.lastActivityTime,
  progressPercentage: overrides.progressPercentage || 0,
  stepStatus: overrides.stepStatus || { completed: 1, total: 3, remaining: 2 },
  currentStep: overrides.currentStep || 1,
  processHealth: overrides.processHealth || {
    isOnTrack: false,
    hasFailures: false,
    isStalled: false,
    statusMessage: ''
  },
  timeInsights: overrides.timeInsights || {
    isOverdue: false,
    daysRunning: 2,
    daysSinceLastUpdate: 1
  },
  durationHours: overrides.durationHours
})

describe('operationsOverviewUtils', () => {
  it('prioritizes the stalest flows first', () => {
    const flows = [
      createFlow({
        flowId: 'flow-1',
        flowName: 'Onboarding',
        templateId: 'tmpl-1',
        status: 'RUNNING',
        processHealth: { isOnTrack: false, hasFailures: false, isStalled: true, statusMessage: 'Waiting on action' },
        timeInsights: { isOverdue: false, daysRunning: 5, daysSinceLastUpdate: 3 }
      }),
      createFlow({
        flowId: 'flow-2',
        flowName: 'Procurement',
        templateId: 'tmpl-2',
        status: 'RUNNING',
        processHealth: { isOnTrack: false, hasFailures: true, isStalled: true, statusMessage: 'System retrying' },
        timeInsights: { isOverdue: false, daysRunning: 8, daysSinceLastUpdate: 7 }
      })
    ]

    expect(getStalledFlows(flows).map(flow => flow.flowId)).toEqual(['flow-2', 'flow-1'])
  })

  it('returns recent failure trend rows with newest buckets first', () => {
    const trend = getRecentFailureTrend([
      { period: '2026-03-01', totalTasks: 12, completedTasks: 10, failedTasks: 1, timedOutTasks: 1, successRate: 83.3 },
      { period: '2026-03-03', totalTasks: 15, completedTasks: 13, failedTasks: 1, timedOutTasks: 1, successRate: 86.7 },
      { period: '2026-03-02', totalTasks: 9, completedTasks: 8, failedTasks: 1, timedOutTasks: 0, successRate: 88.9 }
    ])

    expect(trend.map(bucket => bucket.period)).toEqual(['2026-03-03', '2026-03-02', '2026-03-01'])
  })
})
