import { SalesCampaignQueryVariables } from '../types/SalesCampaignTypes'
import dayjs from 'dayjs'

// Shared GraphQL field selection to eliminate duplication
const SALES_CAMPAIGN_FIELDS = `
  id
  name
  description
  createdAt
  createdBy
  updatedAt
  updatedBy
  version
  startDate
  endDate
  type {
    id
    value
    code
  }
  typeRef
  isDeleted
  recordState
`

// Type definitions for GraphQL conditions
interface SearchCondition {
  [key: string]: unknown
}

// Helper function to build search conditions
const buildSearchConditions = (search: string): { _or: SearchCondition[] } => {
  const searchPattern = { _ilike: `%${search.trim()}%` }
  const possibleDate = dayjs(search.trim())
  const dateFilters: SearchCondition[] = []

  if (possibleDate.isValid()) {
    const startIso = possibleDate.startOf('day').toISOString()
    const endIso = possibleDate.endOf('day').toISOString()
    dateFilters.push(
      { startDate: { _gte: startIso, _lte: endIso } },
      { endDate: { _gte: startIso, _lte: endIso } },
      { createdAt: { _gte: startIso, _lte: endIso } }
    )
  }

  return {
    _or: [
      // Basic campaign fields
      { name: searchPattern },
      { description: searchPattern },
      { businessKey: searchPattern },

      // Campaign type catalog entry
      { type: { value: searchPattern } },
      { type: { code: searchPattern } },

      // Date-based searches (range if input parses as a date)
      ...dateFilters,

      // Type reference for direct ID matching
      { typeRef: searchPattern }
    ]
  }
}

// Helper function to add date range filters
const addDateRangeFilter = (
  conditions: SearchCondition[],
  field: 'createdAt' | 'startDate' | 'endDate',
  after?: string,
  before?: string
): void => {
  if (after) {
    conditions.push({ [field]: { _gte: after } })
  }
  if (before) {
    conditions.push({ [field]: { _lte: before } })
  }
}

export const GET_SALES_CAMPAIGNS = (
  variables: SalesCampaignQueryVariables
): { query: string; variables: Record<string, unknown> } => {
  const { limit = 20, offset = 0, search, orderBy } = variables

  let whereCondition: SearchCondition = { isDeleted: { _eq: false } }
  if (search?.trim()) {
    whereCondition = {
      _and: [{ isDeleted: { _eq: false } }, buildSearchConditions(search)]
    }
  }

  const query = `
    query GetSalesCampaigns($where: SalesCampaignBoolExp, $orderBy: [SalesCampaignOrderBy!], $limit: Int, $offset: Int) {
      SalesCampaign(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        ${SALES_CAMPAIGN_FIELDS}
      }
    }
  `

  return {
    query,
    variables: {
      where: whereCondition,
      orderBy: orderBy || [{ createdAt: 'DESC' }],
      limit: limit,
      offset: offset
    }
  }
}

export const GET_SALES_CAMPAIGNS_WITH_COUNT = (
  variables: SalesCampaignQueryVariables
): { query: string; variables: Record<string, unknown> } => {
  const {
    limit = 20,
    offset = 0,
    search,
    orderBy,
    campaignTypes,
    startDateAfter,
    startDateBefore,
    endDateAfter,
    endDateBefore,
    createdAfter,
    createdBefore
  } = variables

  let whereCondition: SearchCondition

  // Build where conditions
  const conditions: SearchCondition[] = [{ isDeleted: { _eq: false } }]

  // Search condition - comprehensive search across all displayed fields
  if (search?.trim()) {
    conditions.push(buildSearchConditions(search))
  }

  // Campaign type filter
  if (campaignTypes && campaignTypes.length > 0) {
    conditions.push({
      typeRef: { _in: campaignTypes }
    })
  }

  // Date range filters using helper function
  addDateRangeFilter(conditions, 'createdAt', createdAfter, createdBefore)
  addDateRangeFilter(conditions, 'startDate', startDateAfter, startDateBefore)
  addDateRangeFilter(conditions, 'endDate', endDateAfter, endDateBefore)

  if (conditions.length > 1) {
    whereCondition = { _and: conditions }
  } else {
    whereCondition = conditions[0]
  }

  const query = `
    query GetSalesCampaignsWithCount(
      $where: SalesCampaignBoolExp, 
      $orderBy: [SalesCampaignOrderBy!], 
      $limit: Int, 
      $offset: Int,
      $countWhere: SalesCampaignBoolExp
    ) {
      SalesCampaign(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        ${SALES_CAMPAIGN_FIELDS}
      }
      SalesCampaignAggregate(
        where: $countWhere
      ) {
        aggregate {
          count
        }
      }
    }
  `

  return {
    query,
    variables: {
      where: whereCondition,
      orderBy: orderBy || [{ createdAt: 'DESC' }],
      limit: limit,
      offset: offset,
      countWhere: whereCondition
    }
  }
}

export const GET_SALES_CAMPAIGN_STATISTICS = (): string => {
  // Calculate date 30 days ago for previous period comparison
  const thirtyDaysAgo = dayjs().subtract(30, 'days').toISOString()

  return `
    query GetSalesCampaignStatistics {
      # Current period statistics
      totalCampaigns: SalesCampaignAggregate(where: { isDeleted: { _eq: false } }) {
        aggregate {
          count
        }
      }
      activeCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { startDate: { _lte: "now()" } },
            { endDate: { _gte: "now()" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      completedCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { endDate: { _lt: "now()" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      campaignsWithDuration: SalesCampaign(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { startDate: { _isNull: false } },
            { endDate: { _isNull: false } }
          ]
        }
      ) {
        startDate
        endDate
      }

      # Previous period statistics (30 days ago)
      previousTotalCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { createdAt: { _lt: "${thirtyDaysAgo}" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      previousActiveCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { startDate: { _lte: "${thirtyDaysAgo}" } },
            { endDate: { _gte: "${thirtyDaysAgo}" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      previousCompletedCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { endDate: { _lt: "${thirtyDaysAgo}" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      previousCampaignsWithDuration: SalesCampaign(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { startDate: { _isNull: false } },
            { endDate: { _isNull: false } },
            { createdAt: { _lt: "${thirtyDaysAgo}" } }
          ]
        }
      ) {
        startDate
        endDate
      }
    }
  `
}

export const GET_UNIQUE_CAMPAIGN_TYPES = (): string => {
  return `
    query GetUniqueCampaignTypes {
      SalesCampaign(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { typeRef: { _isNull: false } }
          ]
        }
        distinct_on: [typeRef]
      ) {
        typeRef
        type {
          id
          value
          code
        }
      }
    }
  `
}
