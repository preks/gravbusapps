import dayjs from 'dayjs'
import {
  PipelineData,
  WinRateMetrics,
  ActivityVolumeMetrics,
  SalesRepPerformance,
  OpportunityFunnelData,
  PipelineMetrics
} from '../types/dashboardTypes'

/**
 * Extract currency code from API format (Currency:v1:EUR -> EUR)
 */
export const extractCurrencyCode = (currencyId: string): string => {
  if (!currencyId) return 'EUR'
  const parts = currencyId.split(':')
  return parts[parts.length - 1] || 'EUR'
}

/**
 * Format currency value for display with compact formatting for large numbers
 */
export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    if (amount === undefined || amount === null || !isFinite(amount)) return '-'

    const abs = Math.abs(amount)
    const sign = amount < 0 ? '-' : ''

    if (abs >= 1_000_000_000) {
      // Billions
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 1,
        minimumFractionDigits: 0
      }).format(abs / 1_000_000_000)
      return `${sign}${formatted}B`
    }

    if (abs >= 1_000_000) {
      // Millions
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 1,
        minimumFractionDigits: 0
      }).format(abs / 1_000_000)
      return `${sign}${formatted}M`
    }

    // Thousands and below - show as normal currency
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(amount)
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
 * Calculate win rate metrics from opportunities
 */
export const calculateWinRateMetrics = (opportunities: any[]): WinRateMetrics => {
  const now = dayjs()
  const monthStart = now.startOf('month')
  const quarterStart = now.startOf('quarter')

  const monthOpportunities = opportunities.filter(opp => {
    const isInMonth = dayjs(opp.closeDate).isAfter(monthStart)
    const statusCode = opp.opportunityStatus?.code
    const status = statusCode === 'WON' ? 'Won' : statusCode === 'LOST' ? 'Lost' : opp.status
    return isInMonth && ['Won', 'Lost'].includes(status)
  })

  const quarterOpportunities = opportunities.filter(opp => {
    const isInQuarter = dayjs(opp.closeDate).isAfter(quarterStart)
    const statusCode = opp.opportunityStatus?.code
    const status = statusCode === 'WON' ? 'Won' : statusCode === 'LOST' ? 'Lost' : opp.status
    return isInQuarter && ['Won', 'Lost'].includes(status)
  })

  const calculateRate = (opps: any[]) => {
    const won = opps.filter(opp => opp.opportunityStatus?.code === 'WON' || opp.status === 'Won').length
    const lost = opps.filter(opp => opp.opportunityStatus?.code === 'LOST' || opp.status === 'Lost').length
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
export const calculateSalesRepPerformance = (opportunities: any[], activities: any[]): SalesRepPerformance[] => {
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
    if (opp.status === 'Won') {
      rep.dealsWon++
      rep.totalValue += opp.estimatedAmount || 0
    } else if (opp.status === 'Lost') {
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
 * Calculate funnel data from opportunities and stages
 */
export const calculateFunnelData = (opportunities: any[], stages: any[]): OpportunityFunnelData[] => {
  const stageMap = new Map<string, { count: number; value: number }>()

  // Initialize all stages
  stages.forEach(stage => {
    stageMap.set(stage.code, { count: 0, value: 0 })
  })

  // Count opportunities by stage (investment: opportunityPipelineStage)
  opportunities.forEach(opp => {
    const stageRef = opp.opportunityPipelineStageRef || opp.salesPipelineStageRef || opp.stage
    const stageCode =
      opp.opportunityPipelineStage?.code || opp.salesPipelineStage?.code || stageRef?.split(':').pop() || stageRef
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
        order: parseInt(stage.additionalValue1 || '0', 10),
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
export const calculatePipelineMetrics = (opportunities: any[]): PipelineMetrics => {
  const totalOpportunities = opportunities.length
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
  const avgDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0

  const wonOpportunities = opportunities.filter(opp => opp.opportunityStatus?.code === 'WON' || opp.status === 'Won')
  const lostOpportunities = opportunities.filter(opp => opp.opportunityStatus?.code === 'LOST' || opp.status === 'Lost')
  const closedOpportunities = wonOpportunities.length + lostOpportunities.length
  const conversionRate = closedOpportunities > 0 ? (wonOpportunities.length / closedOpportunities) * 100 : 0

  // Calculate average sales cycle (days from creation to close)
  const closedWithDates = opportunities.filter(opp => {
    const statusCode = opp.opportunityStatus?.code
    const status = statusCode === 'WON' ? 'Won' : statusCode === 'LOST' ? 'Lost' : opp.status
    return opp.closeDate && opp.createdAt && ['Won', 'Lost'].includes(status)
  })

  const avgSalesCycle =
    closedWithDates.length > 0
      ? closedWithDates.reduce((sum, opp) => {
          const days = dayjs(opp.closeDate).diff(dayjs(opp.createdAt), 'days')
          return sum + days
        }, 0) / closedWithDates.length
      : 0

  return {
    totalOpportunities,
    totalValue,
    avgDealSize,
    conversionRate,
    avgSalesCycle
  }
}

/**
 * Transform raw pipeline data to structured format
 */
export const transformPipelineData = (
  pipeline: any,
  opportunities: any[],
  activities: any[],
  stages: any[]
): PipelineData => {
  const winRateMetrics = calculateWinRateMetrics(opportunities)
  const activityVolume = calculateActivityVolumeMetrics(activities)
  const leaderboard = calculateSalesRepPerformance(opportunities, activities)
  const funnelData = calculateFunnelData(opportunities, stages)
  const metrics = calculatePipelineMetrics(opportunities)

  return {
    pipeline: {
      id: pipeline.id,
      name: pipeline.value,
      ref: pipeline.code,
      description: pipeline.additionalValue1,
      color: pipeline.additionalValue2 || '#1890ff'
    },
    metrics,
    opportunities: opportunities.map(opp => ({
      id: opp.id,
      name: opp.name,
      estimatedAmount: opp.estimatedAmount || 0,
      currency: extractCurrencyCode(opp.currencyRef),
      status: opp.opportunityStatus?.code || opp.status,
      stage: {
        id: opp.opportunityPipelineStage?.id || opp.salesPipelineStage?.id || '',
        name: opp.opportunityPipelineStage?.value || opp.salesPipelineStage?.value || opp.stage || '',
        ref: opp.opportunityPipelineStageRef || opp.salesPipelineStageRef || opp.stage || '',
        order: parseInt(
          opp.opportunityPipelineStage?.additionalValue1 || opp.salesPipelineStage?.additionalValue1 || '0',
          10
        )
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
    })),
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
    case 'month':
      return {
        startDate: now.startOf('month').toDate(),
        endDate: now.endOf('month').toDate()
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
