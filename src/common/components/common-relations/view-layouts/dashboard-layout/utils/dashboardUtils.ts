import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import {
  PipelineData,
  WinRateMetrics,
  ActivityVolumeMetrics,
  SalesRepPerformance,
  OpportunityFunnelData,
  PipelineMetrics,
  DashboardEntityConfig
} from '../types/dashboardTypes'
import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'

// Extend dayjs with quarterOfYear plugin for quarter calculations
dayjs.extend(quarterOfYear)

// Re-export extractCurrencyCode from central utils for backward compatibility
export { extractCurrencyCode }

/**
 * Format currency value for display with compact formatting for large numbers
 */
export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    if (amount === undefined || amount === null || !Number.isFinite(amount)) return '-'
    return formatCurrencyCompact(amount, currencyCode, undefined, 1, true)
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`
  }
}

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Get opportunity status from data based on entity config
 */
const getOpportunityStatus = (opp: any, config?: DashboardEntityConfig): string => {
  if (config?.fieldMappings.statusField === 'opportunityStatus') {
    const statusCode = opp.opportunityStatus?.code
    if (statusCode === 'WON') return 'Won'
    if (statusCode === 'LOST') return 'Lost'
    return opp.status || ''
  }
  return opp.status || ''
}

/**
 * Check if opportunity is won
 * Checks both IRM format (opportunityStatus.code) and CRM format (status/opportunityStatusRef)
 */
const isWon = (opp: any): boolean => {
  // IRM: opportunityStatus.code === 'WON'
  if (opp.opportunityStatus?.code === 'WON') return true
  // CRM: opportunityStatusRef contains ':WON'
  if (opp.opportunityStatusRef?.includes(':WON')) return true
  // Fallback: status === 'Won'
  if (opp.status === 'Won') return true
  return false
}

/**
 * Check if opportunity is lost
 * Checks both IRM format (opportunityStatus.code) and CRM format (status/opportunityStatusRef)
 */
const isLost = (opp: any): boolean => {
  // IRM: opportunityStatus.code === 'LOST'
  if (opp.opportunityStatus?.code === 'LOST') return true
  // CRM: opportunityStatusRef contains ':LOST'
  if (opp.opportunityStatusRef?.includes(':LOST')) return true
  // Fallback: status === 'Lost'
  if (opp.status === 'Lost') return true
  return false
}

/**
 * Calculate win rate metrics from opportunities
 */
export const calculateWinRateMetrics = (opportunities: any[], config?: DashboardEntityConfig): WinRateMetrics => {
  const now = dayjs()
  const monthStart = now.startOf('month')
  const quarterStart = now.startOf('quarter')

  const monthOpportunities = opportunities.filter(opp => {
    const isInMonth = dayjs(opp.closeDate).isAfter(monthStart)
    const status = getOpportunityStatus(opp, config)
    return isInMonth && ['Won', 'Lost'].includes(status)
  })

  const quarterOpportunities = opportunities.filter(opp => {
    const isInQuarter = dayjs(opp.closeDate).isAfter(quarterStart)
    const status = getOpportunityStatus(opp, config)
    return isInQuarter && ['Won', 'Lost'].includes(status)
  })

  const calculateRate = (opps: any[]) => {
    const won = opps.filter(opp => isWon(opp, config)).length
    const lost = opps.filter(opp => isLost(opp, config)).length
    const total = won + lost
    return {
      won,
      lost,
      winRate: total > 0 ? (won / total) * 100 : 0
    }
  }

  return {
    monthToDate: calculateRate(monthOpportunities),
    quarterToDate: calculateRate(quarterOpportunities)
  }
}

/**
 * Calculate activity volume metrics
 */
export const calculateActivityVolumeMetrics = (activities: any[]): ActivityVolumeMetrics => {
  const now = dayjs()
  const last7Days = now.subtract(7, 'days')
  const last30Days = now.subtract(30, 'days')

  const recent7Days = activities.filter(activity => dayjs(activity.createdAt).isAfter(last7Days))
  const recent30Days = activities.filter(activity => dayjs(activity.createdAt).isAfter(last30Days))

  const countByType = (activityList: any[]) => {
    const counts = { total: 0, calls: 0, emails: 0, meetings: 0 }
    activityList.forEach(activity => {
      counts.total++
      const type = activity.activityType?.code?.toLowerCase() || activity.activityTypeRef?.toLowerCase() || ''
      if (type.includes('call')) counts.calls++
      else if (type.includes('email')) counts.emails++
      else if (type.includes('meeting')) counts.meetings++
    })
    return counts
  }

  return {
    last7Days: countByType(recent7Days),
    last30Days: countByType(recent30Days)
  }
}

/**
 * Calculate sales rep performance for leaderboard
 */
export const calculateSalesRepPerformance = (
  opportunities: any[],
  activities: any[],
  config?: DashboardEntityConfig
): SalesRepPerformance[] => {
  const repMap = new Map<string, SalesRepPerformance>()

  // Process opportunities
  opportunities.forEach(opp => {
    const empId = opp.ownerEmployeeId
    if (!empId) return

    if (!repMap.has(empId)) {
      repMap.set(empId, {
        employeeId: empId,
        firstName: opp.ownerEmployee?.firstName || '',
        lastName: opp.ownerEmployee?.lastName || '',
        displayName: `${opp.ownerEmployee?.firstName || ''} ${opp.ownerEmployee?.lastName || ''}`.trim(),
        dealsWon: 0,
        dealsLost: 0,
        totalValue: 0,
        winRate: 0,
        activitiesCount: 0
      })
    }

    const rep = repMap.get(empId)!
    if (isWon(opp, config)) {
      rep.dealsWon++
      rep.totalValue += opp.estimatedAmount || 0
    } else if (isLost(opp, config)) {
      rep.dealsLost++
    }
  })

  // Process activities
  activities.forEach(activity => {
    const empId = activity.ownerEmployeeId
    if (!empId) return

    if (!repMap.has(empId)) {
      repMap.set(empId, {
        employeeId: empId,
        firstName: activity.ownerEmployee?.firstName || '',
        lastName: activity.ownerEmployee?.lastName || '',
        displayName: `${activity.ownerEmployee?.firstName || ''} ${activity.ownerEmployee?.lastName || ''}`.trim(),
        dealsWon: 0,
        dealsLost: 0,
        totalValue: 0,
        winRate: 0,
        activitiesCount: 0
      })
    }

    const rep = repMap.get(empId)!
    rep.activitiesCount++
  })

  // Calculate win rates and sort
  const reps = Array.from(repMap.values()).map(rep => ({
    ...rep,
    winRate: rep.dealsWon + rep.dealsLost > 0 ? (rep.dealsWon / (rep.dealsWon + rep.dealsLost)) * 100 : 0
  }))

  return reps.sort((a, b) => b.totalValue - a.totalValue)
}

/**
 * Get stage info from opportunity
 * Checks both IRM (opportunityPipelineStage) and CRM (salesPipelineStage) fields
 * Works without config by checking both field patterns
 */
const getStageInfo = (opp: any) => {
  // Check IRM fields first, then fallback to CRM fields
  return {
    stageRef: opp.opportunityPipelineStageRef || opp.salesPipelineStageRef || opp.stage,
    stageCode:
      opp.opportunityPipelineStage?.code || opp.salesPipelineStage?.code || opp.stage?.split(':').pop() || opp.stage,
    stage: opp.opportunityPipelineStage || opp.salesPipelineStage
  }
}

/**
 * Calculate funnel data from opportunities and stages
 */
export const calculateFunnelData = (opportunities: any[], stages: any[]): OpportunityFunnelData[] => {
  const stageMap = new Map<string, { count: number; value: number }>()

  // Initialize all stages
  stages.forEach(stage => {
    stageMap.set(stage.code, { count: 0, value: 0 })
  })

  // Count opportunities by stage
  opportunities.forEach(opp => {
    const { stageCode } = getStageInfo(opp)
    if (stageCode && stageMap.has(stageCode)) {
      const stageData = stageMap.get(stageCode)!
      stageData.count++
      stageData.value += opp.estimatedAmount || 0
    }
  })

  const totalOpportunities = opportunities.length

  return stages
    .map(stage => ({
      stage: {
        id: stage.id,
        name: stage.value,
        ref: stage.code,
        order: Number.parseInt(stage.additionalValue1 || '0', 10),
        color: stage.additionalValue2
      },
      count: stageMap.get(stage.code)?.count || 0,
      value: stageMap.get(stage.code)?.value || 0,
      percentage: totalOpportunities > 0 ? ((stageMap.get(stage.code)?.count || 0) / totalOpportunities) * 100 : 0
    }))
    .sort((a, b) => a.stage.order - b.stage.order)
}

/**
 * Calculate pipeline metrics
 */
export const calculatePipelineMetrics = (opportunities: any[], config?: DashboardEntityConfig): PipelineMetrics => {
  const totalOpportunities = opportunities.length
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
  const avgDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0

  const wonOpportunities = opportunities.filter(opp => isWon(opp, config))
  const lostOpportunities = opportunities.filter(opp => isLost(opp, config))
  const closedOpportunities = wonOpportunities.length + lostOpportunities.length
  const winRate = closedOpportunities > 0 ? (wonOpportunities.length / closedOpportunities) * 100 : 0

  return {
    totalOpportunities,
    totalValue,
    avgDealSize,
    dealsWon: wonOpportunities.length,
    winRate
  }
}

/**
 * Transform raw pipeline data to structured format
 * Handles both raw catalog entry format and pre-transformed PipelineInfo format
 */
export const transformPipelineData = (
  pipeline: any,
  opportunities: any[],
  activities: any[],
  stages: any[],
  config?: DashboardEntityConfig
): PipelineData => {
  const winRateMetrics = calculateWinRateMetrics(opportunities, config)
  const activityVolume = calculateActivityVolumeMetrics(activities)
  const leaderboard = calculateSalesRepPerformance(opportunities, activities, config)
  const funnelData = calculateFunnelData(opportunities, stages)
  const metrics = calculatePipelineMetrics(opportunities, config)

  // Handle both raw catalog entry format and pre-transformed format
  const pipelineName = pipeline.value || pipeline.name || ''
  const pipelineRef = pipeline.code || pipeline.ref || ''
  const pipelineDesc = pipeline.additionalValue1 || pipeline.description || ''
  const pipelineColor = pipeline.additionalValue2 || pipeline.additionalProperties?.color || pipeline.color || '#1890ff'

  return {
    pipeline: {
      id: pipeline.id,
      name: pipelineName,
      ref: pipelineRef,
      description: pipelineDesc,
      color: pipelineColor
    },
    metrics,
    opportunities: opportunities.map(opp => {
      const { stage, stageRef } = getStageInfo(opp)
      return {
        id: opp.id,
        name: opp.name,
        estimatedAmount: opp.estimatedAmount || 0,
        currency: extractCurrencyCode(opp.currencyRef),
        status: getOpportunityStatus(opp, config),
        stage: {
          id: stage?.id || '',
          name: stage?.value || opp.stage || '',
          ref: stageRef || opp.stage || '',
          order: Number.parseInt(stage?.additionalValue1 || '0', 10)
        },
        closeDate: opp.closeDate ? new Date(opp.closeDate) : undefined,
        createdAt: new Date(opp.createdAt),
        ownerEmployee: {
          id: opp.ownerEmployee?.id || '',
          firstName: opp.ownerEmployee?.firstName || '',
          lastName: opp.ownerEmployee?.lastName || '',
          displayName: `${opp.ownerEmployee?.firstName || ''} ${opp.ownerEmployee?.lastName || ''}`.trim()
        },
        winningChance: opp.winningChance
      }
    }),
    activities: activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      type: activity.activityType?.value || activity.activityTypeRef || '',
      description: activity.description,
      createdAt: new Date(activity.createdAt),
      completedAt: activity.completedAt ? new Date(activity.completedAt) : undefined,
      ownerEmployeeId: activity.ownerEmployeeId,
      leadId: activity.leadId,
      opportunityId: activity.opportunityId,
      accountId: activity.accountId
    })),
    winRateMetrics,
    activityVolume,
    funnelData,
    leaderboard
  }
}

/**
 * Get date range for different periods
 */
export const getDateRange = (period: 'month' | 'quarter' | 'year' | 'week' = 'month') => {
  const now = dayjs()

  switch (period) {
    case 'week':
      return {
        startDate: now.startOf('week').toDate(),
        endDate: now.endOf('week').toDate()
      }
    case 'quarter':
      return {
        startDate: now.startOf('quarter').toDate(),
        endDate: now.endOf('quarter').toDate()
      }
    case 'year':
      return {
        startDate: now.startOf('year').toDate(),
        endDate: now.endOf('year').toDate()
      }
    case 'month':
    default:
      return {
        startDate: now.startOf('month').toDate(),
        endDate: now.endOf('month').toDate()
      }
  }
}

/**
 * Format date for display
 */
export const formatDate = (date: Date, format: string = 'MMM DD, YYYY'): string => {
  return dayjs(date).format(format)
}

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}
