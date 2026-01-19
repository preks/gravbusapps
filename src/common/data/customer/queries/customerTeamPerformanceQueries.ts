// Customer team performance queries - comprehensive performance analytics and team comparison
import {
  CUSTOMER_TEAM_PERFORMANCE_METRICS,
  CUSTOMER_ACTIVITY_PERFORMANCE,
  CUSTOMER_TEAM_COMPARISON,
  CUSTOMER_PERFORMANCE_PERIOD,
  CUSTOMER_PERFORMANCE_GOAL,
  CUSTOMER_TEAM_PERFORMANCE_SUMMARY,
  CUSTOMER_PERFORMANCE_SUMMARY,
  CUSTOMER_ACTIVITY_WITH_PERFORMANCE
} from './fragments/customerTeamPerformanceFragments'
import { buildOrderBy, buildSearch, buildFilter, type Descriptor } from '@/common/network/graphql/queryHelpers'

// Unified descriptors for Customer Team Performance (search, sort, filters, and option metadata)
export const CUSTOMER_TEAM_PERFORMANCE_DESCRIPTORS: Descriptor[] = [
  // Search/sort fields
  {
    key: 'employeeName',
    searchPaths: ['employee.displayName', 'employee.firstName', 'employee.lastName'],
    sortPath: 'employee.displayName',
    type: 'text'
  },
  { key: 'totalRevenue', searchPaths: ['totalRevenue'], sortPath: 'totalRevenue', type: 'number' },
  { key: 'activityScore', searchPaths: ['activityScore'], sortPath: 'activityScore', type: 'number' },
  { key: 'leadConversionRate', searchPaths: ['leadConversionRate'], sortPath: 'leadConversionRate', type: 'number' },
  { key: 'opportunityWinRate', searchPaths: ['opportunityWinRate'], sortPath: 'opportunityWinRate', type: 'number' },
  { key: 'periodStart', searchPaths: ['periodStart'], sortPath: 'periodStart', type: 'date' },
  { key: 'periodEnd', searchPaths: ['periodEnd'], sortPath: 'periodEnd', type: 'date' },

  // Filter fields
  { key: 'employeeIds', path: 'employee.id', kind: 'inIds' },
  { key: 'teamIds', path: 'teamId', kind: 'inIds' },
  { key: 'currencyIds', path: 'currency.id', kind: 'inIds' },
  { key: 'periodTypes', path: 'periodType', kind: 'inStrings' },
  { key: 'performanceGrades', path: 'performanceGrade', kind: 'inStrings' },

  // Range filters
  { key: 'revenueMin', path: 'totalRevenue', kind: 'gte' },
  { key: 'revenueMax', path: 'totalRevenue', kind: 'lte' },
  { key: 'activityScoreMin', path: 'activityScore', kind: 'gte' },
  { key: 'activityScoreMax', path: 'activityScore', kind: 'lte' },
  { key: 'conversionRateMin', path: 'leadConversionRate', kind: 'gte' },
  { key: 'conversionRateMax', path: 'leadConversionRate', kind: 'lte' },

  // Date range filters
  { key: 'periodStartFrom', path: 'periodStart', kind: 'dateFrom' },
  { key: 'periodStartTo', path: 'periodStart', kind: 'dateTo' },
  { key: 'periodEndFrom', path: 'periodEnd', kind: 'dateFrom' },
  { key: 'periodEndTo', path: 'periodEnd', kind: 'dateTo' }
]

export interface CustomerTeamPerformanceQueryVariables {
  search?: string
  employeeIds?: string[]
  teamIds?: string[]
  currencyIds?: string[]
  periodTypes?: string[]
  performanceGrades?: string[]

  revenueMin?: number
  revenueMax?: number
  activityScoreMin?: number
  activityScoreMax?: number
  conversionRateMin?: number
  conversionRateMax?: number

  periodStartFrom?: string
  periodStartTo?: string
  periodEndFrom?: string
  periodEndTo?: string

  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Customer Team Performance queries
export const buildCustomerTeamPerformanceWhereCondition = (variables: CustomerTeamPerformanceQueryVariables = {}) => {
  const whereObj: Record<string, any> = {
    isDeleted: { _eq: false }
  }

  // Generic search across dot-paths from descriptors
  const searchObj = buildSearch(variables.search || '', CUSTOMER_TEAM_PERFORMANCE_DESCRIPTORS)
  if (searchObj) {
    whereObj._or = searchObj._or
  }

  // Generic AND filters from descriptors
  const filterObj = buildFilter(variables as any, CUSTOMER_TEAM_PERFORMANCE_DESCRIPTORS)
  if (filterObj && filterObj._and) {
    if (whereObj._and) {
      whereObj._and.push(...filterObj._and)
    } else {
      whereObj._and = filterObj._and
    }
  }

  // Convert object to GraphQL string format
  const buildWhereString = (obj: any, indent = 0): string => {
    const spaces = '  '.repeat(indent)
    if (Array.isArray(obj)) {
      return `[${obj.map(item => buildWhereString(item, indent + 1)).join(', ')}]`
    }
    if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj)
      if (entries.length === 0) return '{}'
      return `{\n${entries
        .map(([key, value]) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            return `${spaces}  ${key}: ${buildWhereString(value, indent + 1)}`
          }
          if (Array.isArray(value)) {
            return `${spaces}  ${key}: ${buildWhereString(value, indent + 1)}`
          }
          if (typeof value === 'string') {
            return `${spaces}  ${key}: "${value}"`
          }
          return `${spaces}  ${key}: ${value}`
        })
        .join(',\n')}\n${spaces}}`
    }
    if (typeof obj === 'string') {
      return `"${obj}"`
    }
    return String(obj)
  }

  return `where: ${buildWhereString(whereObj)}`
}

// Get Customer Team Performance Metrics with full details and aggregate count
export const GET_CUSTOMER_TEAM_PERFORMANCE_METRICS = (
  variables: CustomerTeamPerformanceQueryVariables = {}
): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerTeamPerformanceWhereCondition(variables)

  const orderByBuilt = buildOrderBy(variables.orderBy || [], CUSTOMER_TEAM_PERFORMANCE_DESCRIPTORS)
  const orderByClause = orderByBuilt || 'orderBy: [{ totalRevenue: DESC }]'

  return `
    query GetCustomerTeamPerformanceMetrics {
      CustomerTeamPerformanceMetrics(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_TEAM_PERFORMANCE_METRICS}
      }

      CustomerTeamPerformanceMetricsAggregate(${where}) {
        aggregate { count }
      }
    }
  `
}

// Get Customer Team Performance Metrics by Employee ID
export const GET_CUSTOMER_TEAM_PERFORMANCE_BY_EMPLOYEE_ID = (employeeId: string, period?: string): string => {
  let whereCondition = `
    where: { 
      employeeId: { _eq: "${employeeId}" }, 
      isDeleted: { _eq: false }
  `

  if (period) {
    whereCondition += `, periodType: { _eq: "${period}" }`
  }

  whereCondition += ' }'

  return `
    query GetCustomerTeamPerformanceByEmployeeId {
      CustomerTeamPerformanceMetrics(
        ${whereCondition}
        orderBy: [{ periodStart: DESC }]
        limit: 10
      ) {
        ${CUSTOMER_TEAM_PERFORMANCE_METRICS}
      }
    }
  `
}

// Get Customer Team Performance Comparison
export const GET_CUSTOMER_TEAM_PERFORMANCE_COMPARISON = (teamId: string, period: string): string => {
  return `
    query GetCustomerTeamPerformanceComparison {
      CustomerTeamComparison(
        where: { 
          teamId: { _eq: "${teamId}" },
          comparisonPeriod: { _eq: "${period}" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ employeeRank: ASC }]
      ) {
        ${CUSTOMER_TEAM_COMPARISON}
      }
    }
  `
}

// Get Customer Activity Performance by Employee ID
export const GET_CUSTOMER_ACTIVITY_PERFORMANCE_BY_EMPLOYEE = (employeeId: string, period: string): string => {
  const startDate =
    period === 'monthly'
      ? 'DATE_SUB(NOW(), INTERVAL 1 MONTH)'
      : period === 'quarterly'
        ? 'DATE_SUB(NOW(), INTERVAL 3 MONTH)'
        : 'DATE_SUB(NOW(), INTERVAL 1 YEAR)'

  return `
    query GetCustomerActivityPerformanceByEmployee {
      CustomerActivityPerformance(
        where: { 
          employeeId: { _eq: "${employeeId}" },
          createdAt: { _gte: "${startDate}" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ activityScore: DESC }]
        limit: 100
      ) {
        ${CUSTOMER_ACTIVITY_PERFORMANCE}
      }
    }
  `
}

// Get Customer Team Performance Summary
export const GET_CUSTOMER_TEAM_PERFORMANCE_SUMMARY = (teamId: string, period: string): string => {
  return `
    query GetCustomerTeamPerformanceSummary {
      CustomerTeamPerformanceSummary(
        where: { 
          teamId: { _eq: "${teamId}" },
          periodType: { _eq: "${period}" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ periodStart: DESC }]
        limit: 1
      ) {
        ${CUSTOMER_TEAM_PERFORMANCE_SUMMARY}
      }
    }
  `
}

// Get Customer Performance Periods for Employee
export const GET_CUSTOMER_PERFORMANCE_PERIODS = (employeeId: string, periodType?: string): string => {
  let whereCondition = `
    where: { 
      employeeId: { _eq: "${employeeId}" }, 
      isDeleted: { _eq: false }
  `

  if (periodType) {
    whereCondition += `, periodType: { _eq: "${periodType}" }`
  }

  whereCondition += ' }'

  return `
    query GetCustomerPerformancePeriods {
      CustomerPerformancePeriod(
        ${whereCondition}
        orderBy: [{ periodStart: DESC }]
        limit: 12
      ) {
        ${CUSTOMER_PERFORMANCE_PERIOD}
      }
    }
  `
}

// Get Customer Performance Goals for Employee
export const GET_CUSTOMER_PERFORMANCE_GOALS = (employeeId: string): string => {
  return `
    query GetCustomerPerformanceGoals {
      CustomerPerformanceGoal(
        where: { 
          employeeId: { _eq: "${employeeId}" }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ goalPeriodStart: DESC }]
      ) {
        ${CUSTOMER_PERFORMANCE_GOAL}
      }
    }
  `
}

// Get Customer Performance Leaderboard
export const GET_CUSTOMER_PERFORMANCE_LEADERBOARD = (metric: string, period: string, limit: number = 10): string => {
  const sortField =
    metric === 'revenue'
      ? 'totalRevenue'
      : metric === 'activity_score'
        ? 'activityScore'
        : metric === 'conversion_rate'
          ? 'leadConversionRate'
          : 'totalRevenue'

  return `
    query GetCustomerPerformanceLeaderboard {
      CustomerTeamPerformanceMetrics(
        where: { 
          periodType: { _eq: "${period}" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ ${sortField}: DESC }]
        limit: ${limit}
      ) {
        ${CUSTOMER_PERFORMANCE_SUMMARY}
      }
    }
  `
}

// Get Customer Team Performance with Trends
export const GET_CUSTOMER_TEAM_PERFORMANCE_WITH_TRENDS = (teamId: string): string => {
  return `
    query GetCustomerTeamPerformanceWithTrends {
      # Current period metrics
      current: CustomerTeamPerformanceMetrics(
        where: { 
          team: { id: { _eq: "${teamId}" } },
          periodType: { _eq: "monthly" },
          periodStart: { _gte: "DATE_SUB(NOW(), INTERVAL 1 MONTH)" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ totalRevenue: DESC }]
      ) {
        ${CUSTOMER_TEAM_PERFORMANCE_METRICS}
      }

      # Previous period metrics
      previous: CustomerTeamPerformanceMetrics(
        where: { 
          team: { id: { _eq: "${teamId}" } },
          periodType: { _eq: "monthly" },
          periodStart: { _gte: "DATE_SUB(NOW(), INTERVAL 2 MONTH)" },
          periodEnd: { _lte: "DATE_SUB(NOW(), INTERVAL 1 MONTH)" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ totalRevenue: DESC }]
      ) {
        ${CUSTOMER_TEAM_PERFORMANCE_METRICS}
      }

      # Team summary
      teamSummary: CustomerTeamPerformanceSummary(
        where: { 
          teamId: { _eq: "${teamId}" },
          periodType: { _eq: "monthly" },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ periodStart: DESC }]
        limit: 1
      ) {
        ${CUSTOMER_TEAM_PERFORMANCE_SUMMARY}
      }
    }
  `
}

// Get Customer Activities with Performance for Employee
export const GET_CUSTOMER_ACTIVITIES_WITH_PERFORMANCE = (employeeId: string, limit: number = 50): string => {
  return `
    query GetCustomerActivitiesWithPerformance {
      SalesActivity(
        where: { 
          ownerEmployee: { id: { _eq: "${employeeId}" } },
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
        limit: ${limit}
      ) {
        ${CUSTOMER_ACTIVITY_WITH_PERFORMANCE}
      }

      SalesActivityAggregate(
        where: { 
          ownerEmployee: { id: { _eq: "${employeeId}" } },
          isDeleted: { _eq: false } 
        }
      ) {
        aggregate { count }
      }
    }
  `
}

// Get Customer Conversion Funnel Metrics
export const GET_CUSTOMER_CONVERSION_FUNNEL_METRICS = (employeeIds: string[]): string => {
  const employeeIdList = employeeIds.map(id => `"${id}"`).join(', ')

  return `
    query GetCustomerConversionFunnelMetrics {
      # Lead counts
      leads: LeadAggregate(
        where: { 
          ownerEmployee: { id: { _in: [${employeeIdList}] } },
          isDeleted: { _eq: false } 
        }
      ) {
        aggregate { count }
      }

      # Account counts
      accounts: AccountAggregate(
        where: { 
          ownerEmployee: { id: { _in: [${employeeIdList}] } },
          isDeleted: { _eq: false } 
        }
      ) {
        aggregate { count }
      }

      # Opportunity counts
      opportunities: OpportunityAggregate(
        where: { 
          ownerEmployee: { id: { _in: [${employeeIdList}] } },
          isDeleted: { _eq: false } 
        }
      ) {
        aggregate { count }
      }

      # Won opportunity counts
      wonOpportunities: OpportunityAggregate(
        where: { 
          ownerEmployee: { id: { _in: [${employeeIdList}] } },
          opportunityStatus: { code: { _eq: "WON" } },
          isDeleted: { _eq: false } 
        }
      ) {
        aggregate { count }
      }
    }
  `
}
