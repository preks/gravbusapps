import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

// ==========================================
// CUSTOMER TEAM PERFORMANCE FRAGMENTS
// ==========================================

export const CUSTOMER_TEAM_PERFORMANCE_METRICS = `
    id
    employeeId
    
    # Revenue metrics
    totalRevenue
    quarterlyRevenue
    monthlyRevenue
    currencyId
    revenueTarget
    
    # Activity metrics
    activityCount
    activityScore
    activitiesThisMonth
    activitiesLastMonth
    averageActivityScore
    
    # Conversion metrics
    leadConversionRate
    opportunityWinRate
    averageDealSize
    salesCycleLength
    
    # Time period
    periodStart
    periodEnd
    periodType
    
    ${AUDIT_FIELDS}
    
    # Employee reference
    employee {
      ${EMPLOYEE_REF}
    }
    
    # Currency reference
    currency {
      ${CATALOG_ENTRY}
    }
`

export const CUSTOMER_ACTIVITY_PERFORMANCE = `
    id
    activityId
    employeeId
    
    # Performance data
    activityScore
    occurredAt
    loggedAt
    
    # Performance categorization
    activityCategory
    activityImpact
    outcomeType
    
    # Revenue impact
    contributesToRevenue
    relatedOpportunityValue
    estimatedRevenueImpact
    
    # Follow-up data
    nextActionRequired
    nextActionDate
    
    # Related entity references
    relatedAccountId
    relatedContactId
    relatedLeadId
    relatedOpportunityId
    
    ${AUDIT_FIELDS}
    
    # Activity type reference
    activityType {
      ${CATALOG_ENTRY}
    }
`

export const CUSTOMER_TEAM_COMPARISON = `
    id
    teamId
    employeeId
    
    # Team metrics
    employeeRank
    teamSize
    teamAverageScore
    teamTotalRevenue
    departmentAverageScore
    departmentTotalRevenue
    
    # Individual vs team comparison
    employeeScore
    employeeRevenue
    scorePercentile
    revenuePercentile
    
    # Time period
    comparisonPeriod
    periodStart
    periodEnd
    
    ${AUDIT_FIELDS}
    
    # Team reference
    team {
      id
      name
      managerId
    }
    
    # Employee reference
    employee {
      ${EMPLOYEE_REF}
    }
    
    # Manager reference
    manager {
      ${EMPLOYEE_REF}
    }
`

export const CUSTOMER_PERFORMANCE_PERIOD = `
    id
    employeeId
    
    # Period definition
    periodType
    periodStart
    periodEnd
    
    # Raw metrics for this period
    revenue
    activityCount
    averageActivityScore
    leadCount
    accountCount
    opportunityCount
    wonOpportunityCount
    
    # Targets for this period
    revenueTarget
    activityTarget
    leadTarget
    opportunityTarget
    
    # Status
    isCompleted
    lastUpdatedAt
    
    ${AUDIT_FIELDS}
`

export const CUSTOMER_PERFORMANCE_GOAL = `
    id
    employeeId
    
    # Goal definition
    goalType
    targetValue
    currentValue
    
    # Time frame
    goalPeriodStart
    goalPeriodEnd
    
    # Status
    isAchieved
    achievedAt
    
    ${AUDIT_FIELDS}
    
    # Goal category reference
    goalCategory {
      ${CATALOG_ENTRY}
    }
    
    # Employee reference
    employee {
      ${EMPLOYEE_REF}
    }
`

export const CUSTOMER_TEAM_PERFORMANCE_SUMMARY = `
    id
    teamId
    
    # Team metrics
    teamSize
    totalRevenue
    averageRevenue
    totalActivityScore
    averageActivityScore
    
    # Performance distribution
    topPerformerEmployeeId
    bottomPerformerEmployeeId
    medianRevenue
    medianActivityScore
    
    # Team targets
    teamRevenueTarget
    teamActivityTarget
    
    # Achievement rates
    revenueAchievementRate
    activityAchievementRate
    
    # Time period
    periodStart
    periodEnd
    periodType
    
    ${AUDIT_FIELDS}
    
    # Team reference
    team {
      id
      name
      managerId
      departmentId
    }
`

// ==========================================
// REFERENCE FRAGMENTS FOR RELATED ENTITIES
// ==========================================

export const CUSTOMER_EMPLOYEE_PERFORMANCE_REF = `
    id
    employeeId
    displayName
    firstName
    lastName
    picture
    pictureThumbnail
`

export const CUSTOMER_TEAM_REF = `
    id
    name
    managerId
    departmentId
`

// ==========================================
// AGGREGATED PERFORMANCE FRAGMENTS
// ==========================================

export const CUSTOMER_PERFORMANCE_SUMMARY = `
    # Employee performance summary
    employeeId
    totalRevenue
    activityScore
    leadConversionRate
    opportunityWinRate
    
    # Rankings
    revenueRank
    activityRank
    conversionRank
    overallRank
    
    # Achievement indicators
    revenueAchievementPercentage
    performanceGrade
    
    # Employee reference
    employee {
      ${EMPLOYEE_REF}
    }
`

export const CUSTOMER_TEAM_PERFORMANCE_AGGREGATE = `
    # Team-level aggregations
    teamId
    teamSize
    averageRevenue
    totalRevenue
    averageActivityScore
    topPerformerScore
    bottomPerformerScore
    
    # Team reference
    team {
      ${CUSTOMER_TEAM_REF}
    }
`

// ==========================================
// PERFORMANCE TREND FRAGMENTS
// ==========================================

export const CUSTOMER_PERFORMANCE_TREND = `
    # Current period metrics
    currentPeriodRevenue
    currentPeriodActivityScore
    currentPeriodConversionRate
    
    # Previous period metrics
    previousPeriodRevenue
    previousPeriodActivityScore
    previousPeriodConversionRate
    
    # Trend calculations
    revenueTrendPercentage
    activityTrendPercentage
    conversionTrendPercentage
    
    # Period information
    currentPeriodStart
    currentPeriodEnd
    previousPeriodStart
    previousPeriodEnd
`

// ==========================================
// ENHANCED ACTIVITY FRAGMENTS FOR PERFORMANCE
// ==========================================

export const CUSTOMER_ACTIVITY_WITH_PERFORMANCE = `
    id
    title
    description
    occurredAt
    completedAt
    
    # Performance additions
    activityScore
    activityCategory
    activityImpact
    outcomeType
    contributesToRevenue
    relatedOpportunityValue
    nextActionRequired
    nextActionDate
    
    ${AUDIT_FIELDS}
    
    # Catalog references
    activityType {
      ${CATALOG_ENTRY}
    }
    
    # Employee references
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
    
    # Entity references for performance tracking
    account {
      id
      code
      name
    }
    contact {
      id
      code
      firstName
      lastName
    }
    lead {
      id
      code
      firstName
      lastName
      email
    }
    opportunity {
      id
      code
      name
      estimatedAmount
    }
`
