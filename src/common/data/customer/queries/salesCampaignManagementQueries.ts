import dayjs from 'dayjs'
import type { SalesCampaignQueryVariables } from '../types/salesCampaignManagementTypes'
import {
  CAMPAIGN_STATUS_CODE_ACTIVE,
  CAMPAIGN_STATUS_CODE_COMPLETED,
  CAMPAIGN_STATUS_CODE_PLANNED
} from '@/common/data/customer/constants/customerCatalogs'

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
    objectValue
  }
  typeRef
  isDeleted
  recordState
  customerCampaignSegment { id value code objectValue }
  customerCampaignSegmentRef
  customerPersona { id value code }
  customerPersonaRef
  customerValuePackFocus { id value code }
  customerValuePackFocusRef
  customerIndustryFocus { id value code }
  customerIndustryFocusRef
  country { id value code }
  countryRef
  budgetAllocated
  pipelineTarget
  expectedWinRate
  expectedRevenueContribution
  ownerEmployee { id displayName }
  customerCampaignStatus { id value code objectValue }
  customerCampaignStatusRef
`

interface SearchCondition {
  [key: string]: unknown
}

const extractStatusCodeFromRef = (statusRef: string): string | null => {
  if (!statusRef) {
    return null
  }

  const segments = statusRef.split(':').map(segment => segment.trim())
  const lastSegment = segments[segments.length - 1]

  return lastSegment || null
}

const buildFallbackStatusCondition = (statusCode: string, nowIso: string): SearchCondition | null => {
  if (statusCode === CAMPAIGN_STATUS_CODE_ACTIVE) {
    return {
      _and: [
        { customerCampaignStatusRef: { _isNull: true } },
        { startDate: { _isNull: false } },
        { endDate: { _isNull: false } },
        { startDate: { _lte: nowIso } },
        { endDate: { _gte: nowIso } }
      ]
    }
  }

  if (statusCode === CAMPAIGN_STATUS_CODE_COMPLETED) {
    return {
      _and: [
        { customerCampaignStatusRef: { _isNull: true } },
        { endDate: { _isNull: false } },
        { endDate: { _lt: nowIso } }
      ]
    }
  }

  if (statusCode === CAMPAIGN_STATUS_CODE_PLANNED) {
    return {
      _and: [
        { customerCampaignStatusRef: { _isNull: true } },
        {
          _or: [{ startDate: { _isNull: true } }, { endDate: { _isNull: true } }, { startDate: { _gt: nowIso } }]
        }
      ]
    }
  }

  return null
}

const buildCampaignStatusCondition = (campaignStatuses: string[]): SearchCondition => {
  const statusRefs = campaignStatuses.filter(Boolean)
  const statusCodes = Array.from(
    new Set(statusRefs.map(extractStatusCodeFromRef).filter((code): code is string => Boolean(code)))
  )

  if (statusCodes.length === 0) {
    return { customerCampaignStatusRef: { _in: statusRefs } }
  }

  const nowIso = dayjs().toISOString()
  const fallbackConditions = statusCodes
    .map(code => buildFallbackStatusCondition(code, nowIso))
    .filter((condition): condition is SearchCondition => Boolean(condition))

  return {
    _or: [
      { customerCampaignStatusRef: { _in: statusRefs } },
      { customerCampaignStatus: { code: { _in: statusCodes } } },
      ...fallbackConditions
    ]
  }
}

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
      { name: searchPattern },
      { description: searchPattern },
      { businessKey: searchPattern },
      { type: { value: searchPattern } },
      { type: { code: searchPattern } },
      { customerCampaignStatus: { value: searchPattern } },
      { customerCampaignStatus: { code: searchPattern } },
      ...dateFilters,
      { typeRef: searchPattern }
    ]
  }
}

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

export const GET_SALES_CAMPAIGNS_WITH_COUNT = (
  variables: SalesCampaignQueryVariables
): { query: string; variables: Record<string, unknown> } => {
  const {
    limit = 20,
    offset = 0,
    search,
    orderBy,
    campaignTypes,
    campaignStatuses,
    startDateAfter,
    startDateBefore,
    endDateAfter,
    endDateBefore,
    createdAfter,
    createdBefore
  } = variables

  const conditions: SearchCondition[] = [{ isDeleted: { _eq: false } }]

  if (search?.trim()) {
    conditions.push(buildSearchConditions(search))
  }

  if (campaignTypes && campaignTypes.length > 0) {
    conditions.push({ typeRef: { _in: campaignTypes } })
  }

  if (campaignStatuses && campaignStatuses.length > 0) {
    conditions.push(buildCampaignStatusCondition(campaignStatuses))
  }

  addDateRangeFilter(conditions, 'createdAt', createdAfter, createdBefore)
  addDateRangeFilter(conditions, 'startDate', startDateAfter, startDateBefore)
  addDateRangeFilter(conditions, 'endDate', endDateAfter, endDateBefore)

  const whereCondition: SearchCondition = conditions.length > 1 ? { _and: conditions } : conditions[0]

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
      limit,
      offset,
      countWhere: whereCondition
    }
  }
}

export const GET_SALES_CAMPAIGN_STATISTICS = (): string => {
  const startOfYear = dayjs().startOf('year').toISOString()
  const thirtyDaysAgo = dayjs().subtract(30, 'days').toISOString()

  return `
    query GetSalesCampaignStatistics {
      totalCampaigns: SalesCampaignAggregate(where: { isDeleted: { _eq: false } }) {
        aggregate {
          count
        }
      }
      activeCampaigns: SalesCampaignAggregate(
        where: { 
          isDeleted: { _eq: false },
          customerCampaignStatus: { code: { _eq: "${CAMPAIGN_STATUS_CODE_ACTIVE}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      completedCampaigns: SalesCampaignAggregate(
        where: { 
          isDeleted: { _eq: false },
          customerCampaignStatus: { code: { _eq: "${CAMPAIGN_STATUS_CODE_COMPLETED}" } }
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
            { endDate: { _isNull: false } },
            { startDate: { _gte: "${startOfYear}" } }
          ]
        }
      ) {
        startDate
        endDate
      }
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
            { createdAt: { _lt: "${thirtyDaysAgo}" } },
            { customerCampaignStatus: { code: { _eq: "${CAMPAIGN_STATUS_CODE_ACTIVE}" } } }
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
            { createdAt: { _lt: "${thirtyDaysAgo}" } },
            { customerCampaignStatus: { code: { _eq: "${CAMPAIGN_STATUS_CODE_COMPLETED}" } } }
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
            { startDate: { _gte: "${startOfYear}" } },
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
