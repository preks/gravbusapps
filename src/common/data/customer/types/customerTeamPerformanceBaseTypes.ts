// Base types that match GraphQL responses exactly for customer team performance
// These should match the DBML schema exactly without any computed fields
import type { CatalogEntry, BaseEntity } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

// Forward declarations for reference types
export interface CustomerEmployeePerformanceRef {
  id: string
  employeeId: string
  displayName?: string
  firstName?: string
  lastName?: string
  picture?: string
  pictureThumbnail?: string
}

// =====================================================
// CUSTOMER TEAM PERFORMANCE BASE ENTITIES
// =====================================================

// Customer team performance metrics (aggregated data)
export interface BaseCustomerTeamPerformanceMetrics extends BaseEntity {
  id: string
  employeeId: string

  // Revenue metrics (raw from GraphQL)
  totalRevenue?: number
  quarterlyRevenue?: number
  monthlyRevenue?: number
  currencyId?: string
  revenueTarget?: number

  // Activity metrics (raw counts/scores)
  activityCount?: number
  activityScore?: number
  activitiesThisMonth?: number
  activitiesLastMonth?: number
  averageActivityScore?: number

  // Conversion metrics (raw percentages)
  leadConversionRate?: number
  opportunityWinRate?: number
  averageDealSize?: number
  salesCycleLength?: number

  // Time period
  periodStart?: string // ISO date string
  periodEnd?: string // ISO date string
  periodType?: string // 'monthly', 'quarterly', 'yearly'

  // Employee reference
  employee?: EmployeeRef

  // Currency reference
  currency?: CatalogEntry
}

// Customer activity performance (individual activity analysis)
export interface BaseCustomerActivityPerformance extends BaseEntity {
  id: string
  activityId: string
  employeeId: string

  // Raw performance data from GraphQL
  activityScore?: number
  occurredAt?: string // ISO date string
  loggedAt?: string // ISO date string

  // Performance categorization (raw enum values)
  activityCategory?: string // PROSPECTING, NURTURING, CLOSING, FOLLOW_UP
  activityImpact?: string // HIGH, MEDIUM, LOW
  outcomeType?: string // POSITIVE, NEUTRAL, NEGATIVE

  // Revenue impact (raw numbers)
  contributesToRevenue?: boolean
  relatedOpportunityValue?: number
  estimatedRevenueImpact?: number

  // Follow-up data
  nextActionRequired?: boolean
  nextActionDate?: string // ISO date string

  // Related entity references
  relatedAccountId?: string
  relatedContactId?: string
  relatedLeadId?: string
  relatedOpportunityId?: string

  // Activity type reference
  activityType?: CatalogEntry
}

// Customer team comparison (team-level metrics)
export interface BaseCustomerTeamComparison extends BaseEntity {
  id: string
  teamId: string
  employeeId: string

  // Raw team metrics
  employeeRank?: number
  teamSize?: number
  teamAverageScore?: number
  teamTotalRevenue?: number
  departmentAverageScore?: number
  departmentTotalRevenue?: number

  // Individual vs team comparison
  employeeScore?: number
  employeeRevenue?: number
  scorePercentile?: number
  revenuePercentile?: number

  // Time period
  comparisonPeriod?: string // 'monthly', 'quarterly', 'yearly'
  periodStart?: string // ISO date string
  periodEnd?: string // ISO date string

  // Team and employee references
  team?: {
    id: string
    name: string
    managerId?: string
  }
  employee?: EmployeeRef
  manager?: EmployeeRef
}

// Customer performance period (time-based performance tracking)
export interface BaseCustomerPerformancePeriod extends BaseEntity {
  id: string
  employeeId: string

  // Period definition
  periodType: string // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  periodStart: string // ISO date string
  periodEnd: string // ISO date string

  // Raw metrics for this period
  revenue?: number
  activityCount?: number
  averageActivityScore?: number
  leadCount?: number
  accountCount?: number
  opportunityCount?: number
  wonOpportunityCount?: number

  // Targets for this period
  revenueTarget?: number
  activityTarget?: number
  leadTarget?: number
  opportunityTarget?: number

  // Status
  isCompleted?: boolean
  lastUpdatedAt?: string // ISO date string
}

// Customer performance goal (target and achievement tracking)
export interface BaseCustomerPerformanceGoal extends BaseEntity {
  id: string
  employeeId: string

  // Goal definition
  goalType: string // 'revenue', 'activity_score', 'lead_conversion', 'opportunity_win_rate'
  targetValue: number
  currentValue?: number

  // Time frame
  goalPeriodStart: string // ISO date string
  goalPeriodEnd: string // ISO date string

  // Status
  isAchieved?: boolean
  achievedAt?: string // ISO date string

  // Goal category reference
  goalCategory?: CatalogEntry

  // Employee reference
  employee?: EmployeeRef
}

// Customer team performance summary (team-wide statistics)
export interface BaseCustomerTeamPerformanceSummary extends BaseEntity {
  id: string
  teamId: string

  // Team metrics
  teamSize: number
  totalRevenue?: number
  averageRevenue?: number
  totalActivityScore?: number
  averageActivityScore?: number

  // Performance distribution
  topPerformerEmployeeId?: string
  bottomPerformerEmployeeId?: string
  medianRevenue?: number
  medianActivityScore?: number

  // Team targets
  teamRevenueTarget?: number
  teamActivityTarget?: number

  // Achievement rates
  revenueAchievementRate?: number // percentage of team meeting revenue targets
  activityAchievementRate?: number // percentage of team meeting activity targets

  // Time period
  periodStart: string // ISO date string
  periodEnd: string // ISO date string
  periodType: string // 'monthly', 'quarterly', 'yearly'

  // Team reference
  team?: {
    id: string
    name: string
    managerId?: string
    departmentId?: string
  }
}
